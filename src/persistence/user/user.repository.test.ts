import { DataSource } from 'typeorm';
import { Role } from '../../util/roles';
import type { NewUser } from '../../application/user/user.repository.interface';
import { createInMemoryDatabase } from '../database-connection.mock';
import { UserEntity } from './user.entity';
import { UserRepository } from './user.repository';

/**
 * Repository tests against a real (in-memory sqljs) database, so the actual
 * SQL behaviour — uniqueness, pagination, search — is exercised.
 */
describe('UserRepository', () => {
  let dataSource: DataSource;
  let repository: UserRepository;

  beforeAll(async () => {
    dataSource = await createInMemoryDatabase();
    repository = new UserRepository(dataSource.getRepository(UserEntity));
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  const newUser = (overrides: Partial<NewUser> = {}): NewUser => ({
    fullName: 'Repo Test User',
    email: 'repo-user@akarabo.rw',
    passwordHash: 'hashed-password',
    role: Role.PHOTOGRAPHER,
    isActive: true,
    ...overrides,
  });

  it('creates users with generated id and timestamps', async () => {
    const user = await repository.create(
      newUser({ email: 'create@akarabo.rw' }),
    );

    expect(user.id).toEqual(expect.any(String));
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
    expect(user.isActive).toBe(true);
  });

  it('rejects duplicate emails at the database level', async () => {
    await repository.create(newUser({ email: 'dupe@akarabo.rw' }));

    await expect(
      repository.create(newUser({ email: 'dupe@akarabo.rw' })),
    ).rejects.toThrow();
  });

  it('finds by email including the password hash', async () => {
    await repository.create(
      newUser({ email: 'find-email@akarabo.rw', passwordHash: 'the-hash' }),
    );

    const found = await repository.findByEmail('find-email@akarabo.rw');

    expect(found?.passwordHash).toBe('the-hash');
  });

  it('returns null from findByEmail for an unknown address', async () => {
    await expect(
      repository.findByEmail('ghost@akarabo.rw'),
    ).resolves.toBeNull();
  });

  it('finds by phone', async () => {
    await repository.create(
      newUser({ email: 'find-phone@akarabo.rw', phone: '+250788111222' }),
    );

    const found = await repository.findByPhone('+250788111222');

    expect(found?.email).toBe('find-phone@akarabo.rw');
  });

  it('paginates and filters by role', async () => {
    for (let i = 0; i < 3; i += 1) {
      await repository.create(
        newUser({
          email: `cashier-${i}@akarabo.rw`,
          role: Role.CASHIER,
        }),
      );
    }

    const page = await repository.findAll({
      page: 1,
      limit: 2,
      role: Role.CASHIER,
    });

    expect(page.data).toHaveLength(2);
    expect(page.data.every((user) => user.role === Role.CASHIER)).toBe(true);
    expect(page.meta).toEqual({ page: 1, limit: 2, total: 3 });
  });

  it('searches case-insensitively across name, email and phone', async () => {
    await repository.create(
      newUser({
        email: 'search-target@akarabo.rw',
        fullName: 'FindMe Please',
        phone: '+250788000123',
      }),
    );

    const byName = await repository.findAll({ search: 'findme' });
    const byPhone = await repository.findAll({ search: '788000123' });

    expect(byName.data.map((user) => user.email)).toContain(
      'search-target@akarabo.rw',
    );
    expect(byPhone.data.map((user) => user.email)).toContain(
      'search-target@akarabo.rw',
    );
  });

  it('updates mutable fields and re-reads the fresh row', async () => {
    const created = await repository.create(
      newUser({ email: 'update@akarabo.rw' }),
    );

    created.fullName = 'Updated Name';
    created.role = Role.MANAGER;
    created.isActive = false;
    const updated = await repository.update(created);

    expect(updated.fullName).toBe('Updated Name');
    expect(updated.role).toBe(Role.MANAGER);
    expect(updated.isActive).toBe(false);

    const fresh = await repository.findById(created.id);
    expect(fresh?.fullName).toBe('Updated Name');
  });

  it('keeps the stored password hash when the domain object has none', async () => {
    const created = await repository.create(
      newUser({ email: 'keep-hash@akarabo.rw', passwordHash: 'original-hash' }),
    );

    // A user loaded without the hash (findById) must not erase it.
    const loaded = await repository.findById(created.id);
    expect(loaded?.passwordHash).toBeUndefined();

    await repository.update({ ...loaded!, fullName: 'Renamed Without Hash' });

    const reloaded = await repository.findByEmail('keep-hash@akarabo.rw');
    expect(reloaded?.passwordHash).toBe('original-hash');
  });

  it('records the last login timestamp', async () => {
    const created = await repository.create(
      newUser({ email: 'last-login@akarabo.rw' }),
    );
    const at = new Date('2026-02-03T10:00:00.000Z');

    await repository.updateLastLogin(created.id, at);

    const fresh = await repository.findById(created.id);
    expect(fresh?.lastLoginAt?.toISOString()).toBe(at.toISOString());
  });
});
