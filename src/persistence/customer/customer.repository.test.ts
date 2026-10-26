import { DataSource } from 'typeorm';
import { Role } from '../../util/roles';
import type { NewCustomer } from '../../application/customer/customer.repository.interface';
import { createInMemoryDatabase } from '../database-connection.mock';
import { UserEntity } from '../user/user.entity';
import { CustomerEntity } from './customer.entity';
import { CustomerRepository } from './customer.repository';

/**
 * Repository tests against a real (in-memory sqljs) database, so the actual
 * SQL behaviour — shared phone numbers, filters, pagination, flag flips — is
 * exercised.
 */
describe('CustomerRepository', () => {
  let dataSource: DataSource;
  let repository: CustomerRepository;
  let managerId: string;

  beforeAll(async () => {
    dataSource = await createInMemoryDatabase();
    repository = new CustomerRepository(
      dataSource.getRepository(CustomerEntity),
    );

    // Customers reference the staff member who registered them (FK to users).
    const users = dataSource.getRepository(UserEntity);
    const manager = await users.save(
      users.create({
        fullName: 'Repo Manager',
        email: 'manager-cust-repo@test.rw',
        passwordHash: 'hashed-password',
        role: Role.MANAGER,
        isActive: true,
      }),
    );
    managerId = manager.id;
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  const newCustomer = (overrides: Partial<NewCustomer> = {}): NewCustomer => ({
    name: 'Aline Uwase',
    phone: '+250788000111',
    isActive: true,
    createdByUserId: managerId,
    ...overrides,
  });

  it('inserts the exact customer record', async () => {
    const inserted = await repository.create(
      newCustomer({
        phone: '+250788111111',
        email: 'aline@example.rw',
        address: 'KG 11 Ave, Kigali',
        notes: 'prefers WhatsApp over calls',
      }),
    );

    // Read the row back from the database and compare every field — the
    // stored record must be exactly what was handed to the insert.
    const stored = await repository.findById(inserted.id);
    expect(stored).toEqual({
      id: inserted.id,
      name: 'Aline Uwase',
      phone: '+250788111111',
      email: 'aline@example.rw',
      address: 'KG 11 Ave, Kigali',
      notes: 'prefers WhatsApp over calls',
      isActive: true,
      createdByUserId: managerId,
      createdAt: inserted.createdAt,
      updatedAt: inserted.updatedAt,
    });
  });

  it('leaves unset optional columns as SQL NULL', async () => {
    const inserted = await repository.create(
      newCustomer({ phone: '+250788222222' }),
    );

    const stored = await repository.findById(inserted.id);
    expect(stored).toEqual({
      id: inserted.id,
      name: 'Aline Uwase',
      phone: '+250788222222',
      email: null,
      address: null,
      notes: null,
      isActive: true,
      createdByUserId: managerId,
      createdAt: inserted.createdAt,
      updatedAt: inserted.updatedAt,
    });
  });

  it('allows duplicate phones at the database level', async () => {
    await repository.create(newCustomer({ phone: '+250788333333' }));

    await expect(repository.create(newCustomer({ phone: '+250788333333' }))).resolves.toBeDefined();
  });

  it('finds by phone', async () => {
    await repository.create(
      newCustomer({ name: 'Peter Mugisha', phone: '+250788444444' }),
    );

    const found = await repository.findByPhone('+250788444444');

    expect(found?.name).toBe('Peter Mugisha');
    await expect(repository.findByPhone('+250788999999')).resolves.toBeNull();
  });

  it('filters by active flag and free-text search', async () => {
    await repository.create(
      newCustomer({ name: 'Diane Mukamana', phone: '+250788555555' }),
    );
    await repository.create(
      newCustomer({
        name: 'Old Client',
        phone: '+250788666666',
        isActive: false,
      }),
    );

    const inactive = await repository.findAll({ isActive: false });
    expect(inactive.data.every((c) => c.isActive === false)).toBe(true);
    expect(inactive.data.find((c) => c.name === 'Old Client')).toBeDefined();

    const byName = await repository.findAll({ search: 'diane' });
    expect(byName.data.find((c) => c.name === 'Diane Mukamana')).toBeDefined();
    expect(byName.data.find((c) => c.name === 'Old Client')).toBeUndefined();

    const byPhone = await repository.findAll({ search: '886666' });
    expect(byPhone.data.find((c) => c.name === 'Old Client')).toBeDefined();
  });

  it('paginates with a total count', async () => {
    const page1 = await repository.findAll({ page: 1, limit: 1 });

    expect(page1.data).toHaveLength(1);
    expect(page1.meta).toEqual({ page: 1, limit: 1, total: page1.meta.total });
    expect(page1.meta.total).toBeGreaterThanOrEqual(5);
  });

  it('updates provided fields and keeps the rest', async () => {
    const inserted = await repository.create(
      newCustomer({ name: 'Original Name', phone: '+250788777777' }),
    );

    const updated = await repository.update(inserted.id, {
      name: 'Updated Name',
      notes: 'moved to Rubavu',
    });

    expect(updated.name).toBe('Updated Name');
    expect(updated.notes).toBe('moved to Rubavu');
    expect(updated.phone).toBe('+250788777777');
    expect(updated.createdByUserId).toBe(managerId);

    const stored = await repository.findById(inserted.id);
    expect(stored?.name).toBe('Updated Name');
  });

  it('flips the active flag without deleting the row', async () => {
    const inserted = await repository.create(
      newCustomer({ phone: '+250788888888' }),
    );

    const deactivated = await repository.setActive(inserted.id, false);
    expect(deactivated.isActive).toBe(false);

    // Deactivation is a flag flip — the customer row always survives.
    const stored = await repository.findById(inserted.id);
    expect(stored).not.toBeNull();
    expect(stored?.isActive).toBe(false);

    const reactivated = await repository.setActive(inserted.id, true);
    expect(reactivated.isActive).toBe(true);
  });
});
