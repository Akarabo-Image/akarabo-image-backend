import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from '../../util/roles';
import { PushTokenEntity } from '../../persistence/notification/push-token.entity';
import { UserEntity } from '../../persistence/user/user.entity';
import { sendHeadsUpNotification } from '../pushService.js';

export const ANDROID_ALERT_CHANNEL_ID = 'akarabo_alerts_v1';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(
    @InjectRepository(PushTokenEntity)
    private readonly tokens: Repository<PushTokenEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
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

      await this.sendToDevices(devices, title, body, data);
    } catch (error) {
      this.logger.error(
        `Could not send push notification: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  async notifyUser(
    userId: string,
    title: string,
    body: string,
    data: Record<string, string>,
  ): Promise<void> {
    try {
      const activeUser = await this.users.findOne({
        select: { id: true },
        where: { id: userId, isActive: true },
      });
      if (!activeUser) return;

      const devices = await this.tokens.find({ where: { userId } });
      if (devices.length === 0) return;
      await this.sendToDevices(devices, title, body, data);
    } catch (error) {
      this.logger.error(
        `Could not send push notification: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  private async sendToDevices(
    devices: PushTokenEntity[],
    title: string,
    body: string,
    data: Record<string, string>,
  ): Promise<void> {
    const results = await Promise.allSettled(
      devices.map(({ token }) =>
        sendHeadsUpNotification(token, title, body, data),
      ),
    );
    const invalidTokens = results.flatMap((result, index) =>
      result.status === 'fulfilled' &&
      result.value &&
      typeof result.value === 'object' &&
      result.value.invalidToken
        ? [devices[index].token]
        : [],
    );
    if (invalidTokens.length) {
      await this.tokens.delete({ token: In(invalidTokens) });
    }

    const failureCount = results.filter(
      (result) => result.status === 'rejected',
    ).length;
    if (failureCount) {
      this.logger.warn(`FCM delivery failed for ${failureCount} device(s).`);
    }
  }
}
