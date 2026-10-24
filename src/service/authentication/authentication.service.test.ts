import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { TIME_PROVIDER } from '../../application/time-provider.interface';
import { timeProviderMock } from '../../application/time-provider.mock';
import { Role } from '../../util/roles';
import { AuditServiceImpl } from '../audit/audit.service';
import { userBuilder } from '../../application/user/user.builder';
import { USER_REPOSITORY } from '../../application/user/user.repository.interface';
import { userRepositoryMock } from '../../application/user/user.repository.mock';
import { AUTHENTICATION_CONFIG } from '../../application/authentication/authentication.config';
import { AuthenticationError } from '../../application/authentication/authentication.error';
import { AuthenticationServiceImpl } from './authentication.service';

describe('AuthenticationService', () => {
  let service: AuthenticationServiceImpl;

  const password = 'correct-password';
  let passwordHash: string;

  const owner = userBuilder()
    .withEmail('owner@akarabo.rw')
    .withFullName('Studio Owner')
    .withRole(Role.OWNER)
    .build();

  let users: jest.Mocked<ReturnType<typeof userRepositoryMock>>;
  const jwtService = { signAsync: jest.fn() };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    jest.clearAllMocks();
    passwordHash = await bcrypt.hash(password, 4);
    users = userRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationServiceImpl,
        { provide: USER_REPOSITORY, useValue: users },
        { provide: JwtService, useValue: jwtService },
        { provide: AuditServiceImpl, useValue: audit },
        { provide: AUTHENTICATION_CONFIG, useValue: { expiresIn: '1d' } },
        { provide: ConfigService, useValue: { getOrThrow: () => '1d' } },
        { provide: TIME_PROVIDER, useValue: timeProviderMock() },
      ],
    }).compile();

    service = module.get(AuthenticationServiceImpl);
  });

  describe('login', () => {
    it('returns a token and a sanitized user on valid credentials', async () => {
      users.findByEmail.mockResolvedValue({
        ...owner,
        passwordHash,
      });
      jwtService.signAsync.mockResolvedValue('signed-token');

      const result = await service.login({
        email: owner.email,
        password,
      });

      expect(result.accessToken).toBe('signed-token');
      expect(result.expiresIn).toBe('1d');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user.email).toBe(owner.email);
      expect(users.updateLastLogin).toHaveBeenCalledWith(
        owner.id,
        expect.any(Date),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN', userId: owner.id }),
      );
    });

    it('rejects an unknown email', async () => {
      users.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@akarabo.rw', password }),
      ).rejects.toThrow(AuthenticationError);
      expect(jwtService.signAsync).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it('rejects a wrong password', async () => {
      users.findByEmail.mockResolvedValue({
        ...owner,
        passwordHash,
      });

      await expect(
        service.login({ email: owner.email, password: 'wrong-password' }),
      ).rejects.toThrow(AuthenticationError);
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('rejects a deactivated account', async () => {
      users.findByEmail.mockResolvedValue({
        ...owner,
        passwordHash,
        isActive: false,
      });

      await expect(
        service.login({ email: owner.email, password }),
      ).rejects.toThrow(AuthenticationError);
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('records the logout in the audit trail', async () => {
      const result = await service.logout(
        { id: owner.id, email: owner.email, role: owner.role },
        '127.0.0.1',
      );

      expect(result.success).toBe(true);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGOUT', userId: owner.id }),
      );
    });
  });

  describe('me', () => {
    it('returns the fresh profile of the authenticated user', async () => {
      users.findById.mockResolvedValue(owner);

      const profile = await service.me({
        id: owner.id,
        email: owner.email,
        role: owner.role,
      });

      expect(profile.id).toBe(owner.id);
      expect(users.findById).toHaveBeenCalledWith(owner.id);
      expect(profile).not.toHaveProperty('passwordHash');
    });

    it('rejects a token whose account no longer exists', async () => {
      users.findById.mockResolvedValue(null);

      await expect(
        service.me({
          id: owner.id,
          email: owner.email,
          role: owner.role,
        }),
      ).rejects.toThrow(AuthenticationError);
    });
  });
});
