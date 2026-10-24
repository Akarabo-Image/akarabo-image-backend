import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { TIME_PROVIDER } from '../../application/time-provider.interface';
import type { TimeProvider } from '../../application/time-provider.interface';
import type { AuthUser } from '../../application/auth-user';
import { AuditServiceImpl } from '../audit/audit.service';
import type { UserRepository } from '../../application/user/user.repository.interface';
import { USER_REPOSITORY } from '../../application/user/user.repository.interface';
import { toPublicUser } from '../../application/user/user';
import type {
  AuthenticationService,
  LoginCredentials,
  LoginResult,
  LogoutResult,
} from './authentication.service.interface';
import { AUTHENTICATION_CONFIG } from '../../application/authentication/authentication.config';
import type { AuthenticationConfig } from '../../application/authentication/authentication.config';
import { AuthenticationError } from '../../application/authentication/authentication.error';

/**
 * Login / logout / profile use cases. Password verification and token
 * issuance live here; data access goes through the UserRepository port.
 */
@Injectable()
export class AuthenticationServiceImpl implements AuthenticationService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly jwtService: JwtService,
    private readonly audit: AuditServiceImpl,
    @Inject(AUTHENTICATION_CONFIG)
    private readonly config: AuthenticationConfig,
    @Inject(TIME_PROVIDER) private readonly time: TimeProvider,
  ) {}

  async login(
    credentials: LoginCredentials,
    ipAddress?: string,
  ): Promise<LoginResult> {
    const user = await this.users.findByEmail(credentials.email);

    // Same error for "no such user", "wrong password" and "deactivated":
    // never reveal which of them was wrong.
    if (!user || !user.isActive) {
      throw new AuthenticationError();
    }

    const passwordMatches = await bcrypt.compare(
      credentials.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new AuthenticationError();
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.users.updateLastLogin(user.id, this.time.now());
    await this.audit.log({
      userId: user.id,
      action: 'LOGIN',
      entity: 'Auth',
      ipAddress,
    });

    return {
      accessToken,
      expiresIn: this.config.expiresIn,
      user: toPublicUser(user),
    };
  }

  /**
   * Tokens are stateless and valid for one day; logout records the action in
   * the audit trail and the client discards its token. (Token blacklisting /
   * refresh-token rotation can be added here later if needed.)
   */
  async logout(user: AuthUser, ipAddress?: string): Promise<LogoutResult> {
    await this.audit.log({
      userId: user.id,
      action: 'LOGOUT',
      entity: 'Auth',
      ipAddress,
    });
    return {
      success: true,
      message: 'Logged out successfully. Discard your access token.',
    };
  }

  /** Fresh profile of the logged-in user (role changes show up immediately). */
  async me(user: AuthUser) {
    const profile = await this.users.findById(user.id);
    if (!profile) {
      throw new AuthenticationError('Your account no longer exists');
    }
    return toPublicUser(profile);
  }
}
