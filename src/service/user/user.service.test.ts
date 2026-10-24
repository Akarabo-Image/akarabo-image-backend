import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { TIME_PROVIDER } from '../../application/time-provider.interface';
import { timeProviderMock } from '../../application/time-provider.mock';
import { AuthUser } from '../../application/auth-user';
import { Role } from '../../util/roles';
import { AuditServiceImpl } from '../audit/audit.service';
import { DuplicateEmailError } from '../../application/user/duplicate-email.error';
import { DuplicatePhoneError } from '../../application/user/duplicate-phone.error';
import { USER_REPOSITORY } from '../../application/user/user.repository.interface';
import { userRepositoryMock } from '../../application/user/user.repository.mock';
import { UserServiceImpl } from './user.service';
import { userBuilder, UserBuilder } from '../../application/user/user.builder';
import { UserAccessDeniedError } from '../../application/user/user-access-denied.error';
import { UserNotFoundError } from '../../application/user/user-not-found.error';
import { UserSelfDeletionError } from '../../application/user/user-self-deletion.error';

describe('UserService', () => {
  let service: UserServiceImpl;
  let users: jest.Mocked<ReturnType<typeof userRepositoryMock>>;
  let audit: { log: jest.Mock };

  const ownerActor: AuthUser = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'owner@akarabo.rw',
    role: Role.OWNER,
  };

  const managerActor: AuthUser = {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'manager@akarabo.rw',
    role: Role.MANAGER,
  };

  beforeEach(async () => {
    users = userRepositoryMock();
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserServiceImpl,
        { provide: USER_REPOSITORY, useValue: users },
        { provide: AuditServiceImpl, useValue: audit },
        { provide: TIME_PROVIDER, useValue: timeProviderMock() },
      ],
    }).compile();

    service = module.get(UserServiceImpl);
  });

  describe('create', () => {
    const data = {
      fullName: 'Test Cashier',
      email: 'cashier@akarabo.rw',
      password: 'CashierPass1',
      role: Role.CASHIER,
    };

    it('creates a user with a hashed password and audits the action', async () => {
      const user = await service.create(data, ownerActor);

      const saved = users.create.mock.calls[0][0];
      expect(saved.passwordHash).not.toBe(data.password);
      expect(await bcrypt.compare(data.password, saved.passwordHash)).toBe(
        true,
      );
      expect(user).not.toHaveProperty('passwordHash');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_CREATED',
          userId: ownerActor.id,
        }),
      );
    });

    it('rejects duplicate emails', async () => {
      users.findByEmail.mockResolvedValue(
        userBuilder().withEmail(data.email).build(),
      );

      await expect(service.create(data, ownerActor)).rejects.toThrow(
        DuplicateEmailError,
      );
      expect(users.create).not.toHaveBeenCalled();
    });

    it('rejects duplicate phone numbers', async () => {
      users.findByPhone.mockResolvedValue(
        userBuilder().withPhone('+250788000111').build(),
      );

      await expect(
        service.create({ ...data, phone: '+250788000111' }, ownerActor),
      ).rejects.toThrow(DuplicatePhoneError);
      expect(users.create).not.toHaveBeenCalled();
    });

    it('forbids managers from creating owner accounts', async () => {
      await expect(
        service.create({ ...data, role: Role.OWNER }, managerActor),
      ).rejects.toThrow(UserAccessDeniedError);
      expect(users.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns sanitized users with pagination meta', async () => {
      users.findAll.mockResolvedValue({
        data: [userBuilder().withEmail('listed@akarabo.rw').build()],
        meta: { page: 1, limit: 20, total: 1 },
      });

      const result = await service.findAll({});

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).not.toHaveProperty('passwordHash');
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 1 });
    });
  });

  describe('findOne', () => {
    it('returns a sanitized user', async () => {
      const existing = userBuilder().build();
      users.findById.mockResolvedValue(existing);

      const found = await service.findOne(existing.id);

      expect(found.id).toBe(existing.id);
      expect(found).not.toHaveProperty('passwordHash');
    });

    it('throws for an unknown user', async () => {
      await expect(
        service.findOne('44444444-4444-4444-4444-444444444444'),
      ).rejects.toThrow(UserNotFoundError);
    });
  });

  describe('update', () => {
    it('throws for an unknown user', async () => {
      await expect(
        service.update('44444444-4444-4444-4444-444444444444', {}, ownerActor),
      ).rejects.toThrow(UserNotFoundError);
    });

    it('updates fields and records before/after in the audit trail', async () => {
      const existing = userBuilder().build();
      users.findById.mockResolvedValue(existing);
      users.update.mockImplementation((user) => Promise.resolve(user));

      const updated = await service.update(
        existing.id,
        { fullName: 'Renamed User' },
        ownerActor,
      );

      expect(updated.fullName).toBe('Renamed User');

      type AuditCall = [
        {
          action: string;
          entityId?: string;
          changes?: { before?: unknown; after?: unknown };
        },
      ];
      const [entry] = audit.log.mock.calls[0] as AuditCall;
      expect(entry.action).toBe('USER_UPDATED');
      expect(entry.entityId).toBe(existing.id);
      expect(entry.changes?.before).toBeDefined();
      expect(entry.changes?.after).toBeDefined();
    });

    it('forbids a manager from promoting someone to owner', async () => {
      users.findById.mockResolvedValue(userBuilder().build());

      await expect(
        service.update(
          '44444444-4444-4444-4444-444444444444',
          { role: Role.OWNER },
          managerActor,
        ),
      ).rejects.toThrow(UserAccessDeniedError);
    });

    it('rejects an email already used by another user', async () => {
      users.findById.mockResolvedValue(
        userBuilder().withId('55555555-5555-5555-5555-555555555555').build(),
      );
      users.findByEmail.mockResolvedValue(
        userBuilder().withEmail('taken@akarabo.rw').build(),
      );

      await expect(
        service.update(
          '55555555-5555-5555-5555-555555555555',
          { email: 'taken@akarabo.rw' },
          ownerActor,
        ),
      ).rejects.toThrow(DuplicateEmailError);
      expect(users.update).not.toHaveBeenCalled();
    });

    it('rejects a phone already used by another user', async () => {
      users.findById.mockResolvedValue(
        userBuilder().withId('55555555-5555-5555-5555-555555555555').build(),
      );
      users.findByPhone.mockResolvedValue(
        userBuilder().withPhone('+250788000999').build(),
      );

      await expect(
        service.update(
          '55555555-5555-5555-5555-555555555555',
          { phone: '+250788000999' },
          ownerActor,
        ),
      ).rejects.toThrow(DuplicatePhoneError);
    });
  });

  describe('deactivate', () => {
    it('refuses self-deactivation', async () => {
      await expect(
        service.deactivate(ownerActor.id, ownerActor),
      ).rejects.toThrow(UserSelfDeletionError);
    });

    it('deactivates another user and audits it', async () => {
      const existing = userBuilder()
        .withId('55555555-5555-5555-5555-555555555555')
        .build();
      users.findById.mockResolvedValue(existing);
      users.update.mockImplementation((user) => Promise.resolve(user));

      const result = await service.deactivate(existing.id, ownerActor);

      expect(result.isActive).toBe(false);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_DEACTIVATED' }),
      );
    });

    it('throws for an unknown user', async () => {
      await expect(
        service.deactivate('44444444-4444-4444-4444-444444444444', ownerActor),
      ).rejects.toThrow(UserNotFoundError);
    });
  });

  describe('activate', () => {
    it('reactivates a user and audits it', async () => {
      const existing: UserBuilder = userBuilder().active(false);
      users.findById.mockResolvedValue(existing.build());
      users.update.mockImplementation((user) => Promise.resolve(user));

      const result = await service.activate(existing.build().id, ownerActor);

      expect(result.isActive).toBe(true);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_ACTIVATED' }),
      );
    });
  });
});
