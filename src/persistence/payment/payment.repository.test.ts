import { DataSource } from 'typeorm';
import { Role } from '../../util/roles';
import {
  PaymentMethod,
  PaymentStatus,
} from '../../application/payment/payment';
import type { NewPayment } from '../../application/payment/payment.repository.interface';
import { createInMemoryDatabase } from '../database-connection.mock';
import { UserEntity } from '../user/user.entity';
import { PaymentEntity } from './payment.entity';
import { PaymentRepository } from './payment.repository';

/**
 * Repository tests against a real (in-memory sqljs) database, so the actual
 * SQL behaviour — uniqueness, filters, pagination, reversals — is exercised.
 */
describe('PaymentRepository', () => {
  let dataSource: DataSource;
  let repository: PaymentRepository;
  let recorderId: string;

  beforeAll(async () => {
    dataSource = await createInMemoryDatabase();
    repository = new PaymentRepository(dataSource.getRepository(PaymentEntity));

    // Payments reference the user who recorded them (FK to users).
    const users = dataSource.getRepository(UserEntity);
    const recorder = await users.save(
      users.create({
        fullName: 'Repo Cashier',
        email: 'cashier-repo@test.rw',
        passwordHash: 'hashed-password',
        role: Role.CASHIER,
        isActive: true,
      }),
    );
    recorderId = recorder.id;
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  const newPayment = (overrides: Partial<NewPayment> = {}): NewPayment => ({
    amount: 100000,
    currency: 'RWF',
    method: PaymentMethod.MOBILE_MONEY,
    status: PaymentStatus.COMPLETED,
    recordedByUserId: recorderId,
    ...overrides,
  });

  it('inserts the exact payment record', async () => {
    const inserted = await repository.create(
      newPayment({
        bookingId: 'bbbbbbbb-1111-4111-8111-111111111111',
        amount: 250000,
        reference: 'MOMO-EXACT-1',
        notes: 'wedding package deposit',
      }),
    );

    // Read the row back from the database and compare every field — the
    // stored record must be exactly what was handed to the insert.
    const stored = await repository.findById(inserted.id);
    expect(stored).toEqual({
      id: inserted.id,
      bookingId: 'bbbbbbbb-1111-4111-8111-111111111111',
      studioServiceId: null,
      amount: 250000,
      currency: 'RWF',
      method: PaymentMethod.MOBILE_MONEY,
      reference: 'MOMO-EXACT-1',
      notes: 'wedding package deposit',
      status: PaymentStatus.COMPLETED,
      recordedByUserId: recorderId,
      // Nullable columns come back as SQL NULL when nothing was set:
      reversedAt: null,
      reversedByUserId: null,
      reversalReason: null,
      createdAt: inserted.createdAt,
      updatedAt: inserted.updatedAt,
    });
  });

  it('rejects duplicate references at the database level', async () => {
    await repository.create(newPayment({ reference: 'MOMO-DUPE-1' }));

    await expect(
      repository.create(newPayment({ reference: 'MOMO-DUPE-1' })),
    ).rejects.toThrow();
  });

  it('allows many payments without a reference', async () => {
    await repository.create(newPayment({ amount: 1000 }));
    await repository.create(newPayment({ amount: 2000 }));

    // Only the three reference-less payments from other tests may collide —
    // they never do because NULLs are distinct in unique indexes.
    const found = await repository.findAll({ page: 1, limit: 100 });
    expect(found.data.length).toBeGreaterThanOrEqual(3);
  });

  it('finds by reference', async () => {
    await repository.create(newPayment({ reference: 'MOMO-FIND-1' }));

    const found = await repository.findByReference('MOMO-FIND-1');

    expect(found?.reference).toBe('MOMO-FIND-1');
  });

  it('returns null from findByReference for an unknown receipt', async () => {
    await expect(
      repository.findByReference('MOMO-UNKNOWN'),
    ).resolves.toBeNull();
  });

  it('paginates and filters by method and status', async () => {
    await repository.create(
      newPayment({ method: PaymentMethod.CASH, amount: 5000 }),
    );
    await repository.create(
      newPayment({
        method: PaymentMethod.CASH,
        amount: 6000,
        status: PaymentStatus.REVERSED,
      }),
    );

    const cash = await repository.findAll({ method: PaymentMethod.CASH });
    expect(cash.data.every((p) => p.method === PaymentMethod.CASH)).toBe(true);

    const reversed = await repository.findAll({
      status: PaymentStatus.REVERSED,
    });
    expect(
      reversed.data.every((p) => p.status === PaymentStatus.REVERSED),
    ).toBe(true);

    const page1 = await repository.findAll({
      method: PaymentMethod.CASH,
      page: 1,
      limit: 1,
    });
    expect(page1.data).toHaveLength(1);
    expect(page1.meta.total).toBe(2);
  });

  it('filters by creation date range', async () => {
    await repository.create(
      newPayment({ reference: 'MOMO-DATED-1', amount: 7000 }),
    );
    const inserted = await repository.findByReference('MOMO-DATED-1');
    const createdAt = inserted?.createdAt ?? new Date();

    const after = await repository.findAll({
      dateFrom: new Date(createdAt.getTime() + 60_000),
    });
    expect(
      after.data.find((p) => p.reference === 'MOMO-DATED-1'),
    ).toBeUndefined();

    const before = await repository.findAll({
      dateFrom: new Date(createdAt.getTime() - 60_000),
    });
    expect(
      before.data.find((p) => p.reference === 'MOMO-DATED-1'),
    ).toBeDefined();
  });

  it('marks a payment reversed without deleting the row', async () => {
    const payment = await repository.create(
      newPayment({ reference: 'MOMO-REVERSE-1' }),
    );

    const reversed = await repository.reverse(payment.id, {
      reversedAt: new Date('2026-02-01T00:00:00.000Z'),
      reversedByUserId: recorderId,
      reversalReason: 'counted twice',
    });

    expect(reversed.status).toBe(PaymentStatus.REVERSED);
    expect(reversed.reversalReason).toBe('counted twice');
    expect(reversed.reversedByUserId).toBe(recorderId);
    expect(reversed.amount).toBe(payment.amount);

    // The original row still exists — financial history is never deleted.
    await expect(repository.findById(payment.id)).resolves.not.toBeNull();
  });
});
