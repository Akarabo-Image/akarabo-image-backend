import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type ServiceAccount,
} from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import { In, Repository } from 'typeorm';
import { Role } from '../../util/roles';
import { PushTokenEntity } from '../../persistence/notification/push-token.entity';
import { UserEntity } from '../../persistence/user/user.entity';

export const ANDROID_ALERT_CHANNEL_ID = 'akarabo_alerts_v1';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private messaging: Messaging | null | undefined;

  constructor(
    @InjectRepository(PushTokenEntity)
    private readonly tokens: Repository<PushTokenEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly config: ConfigService,
  ) {}

  async registerDevice(userId: string, token: string): Promise<void> {
    const existing = await this.tokens.findOneBy({ token });
    if (existing) {
      if (existing.userId !== userId) existing.userId = userId;
      await this.tokens.save(existing);
      return;
    }
    await this.tokens.save(this.tokens.create({ userId, token }));
  }

  async removeDevice(userId: string, token: string): Promise<void> {
    await this.tokens.delete({ userId, token });
  }

  async notifyManagers(
    title: string,
    body: string,
    data: Record<string, string>,
  ): Promise<void> {
    try {
      const managers = await this.users.find({
        select: { id: true },
        where: { role: In([Role.OWNER, Role.MANAGER]), isActive: true },
      });
      if (managers.length === 0) return;

      const devices = await this.tokens.find({
        where: { userId: In(managers.map(({ id }) => id)) },
      });
      if (devices.length === 0) return;

      const messaging = this.getMessaging();
      if (!messaging) return;

      for (let offset = 0; offset < devices.length; offset += 500) {
        const batch = devices.slice(offset, offset + 500);
        const result = await messaging.sendEachForMulticast({
          tokens: batch.map(({ token }) => token),
          notification: { title, body },
          data,
          android: {
            priority: 'high',
            notification: {
              channelId: ANDROID_ALERT_CHANNEL_ID,
              sound: 'default',
              priority: 'max',
            },
          },
        });

        const expiredTokens = result.responses.flatMap((response, index) => {
          const code = response.error?.code;
          return code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
            ? [batch[index].token]
            : [];
        });
        if (expiredTokens.length) {
          await this.tokens.delete({ token: In(expiredTokens) });
        }
        if (result.failureCount) {
          this.logger.warn(`FCM delivery failed for ${result.failureCount} device(s).`);
        }
      }
    } catch (error) {
      this.logger.error(
        `Could not send push notification: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  private getMessaging(): Messaging | null {
    if (this.messaging !== undefined) return this.messaging;

    const projectId = this.config.get<string>('firebase.projectId');
    const serviceAccountJson = this.config.get<string>('firebase.serviceAccountJson');
    if (!serviceAccountJson && !projectId && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      this.logger.warn('FCM is not configured; push notifications are disabled until Firebase server credentials are configured.');
      this.messaging = null;
      return null;
    }

    try {
      const serviceAccount = serviceAccountJson
        ? this.parseServiceAccount(serviceAccountJson)
        : undefined;
      const appProjectId = projectId ?? serviceAccount?.projectId;
      const existingApp = getApps()[0];
      if (existingApp && projectId && existingApp.options.projectId !== projectId) {
        throw new Error('The initialized Firebase app does not match FIREBASE_PROJECT_ID.');
      }
      const app = existingApp ?? initializeApp({
        credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
        ...(appProjectId ? { projectId: appProjectId } : {}),
      });
      if (projectId && app.options.projectId !== projectId) {
        throw new Error('The initialized Firebase app does not match FIREBASE_PROJECT_ID.');
      }
      this.messaging = getMessaging(app);
      return this.messaging;
    } catch (error) {
      this.logger.error(
        `Firebase Admin could not be initialized: ${error instanceof Error ? error.message : 'invalid Firebase configuration'}`,
      );
      this.messaging = null;
      return null;
    }
  }

  private parseServiceAccount(value: string): ServiceAccount {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must contain a service account object.');
    }
    const account = parsed as Record<string, unknown>;
    if (
      typeof account.project_id !== 'string' ||
      typeof account.client_email !== 'string' ||
      typeof account.private_key !== 'string'
    ) {
      throw new Error('Firebase service account JSON is missing required fields.');
    }
    if (this.config.get<string>('firebase.projectId') && account.project_id !== this.config.get<string>('firebase.projectId')) {
      throw new Error('FIREBASE_PROJECT_ID does not match the service account project.');
    }
    return {
      projectId: account.project_id,
      clientEmail: account.client_email,
      privateKey: account.private_key.replace(/\\n/g, '\n'),
    };
  }
}
