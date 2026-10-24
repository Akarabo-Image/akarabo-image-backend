import { DataSource } from 'typeorm';
import { Role } from '../../util/roles';
import {
  ExpenseCategory,
  ExpenseStatus,
} from '../../application/expense/expense';
import type { NewExpense } from '../../application/expense/expense.repository.interface';
import { createInMemoryDatabase } from '../database-connection.mock';
import { UserEntity } from '../user/user.entity';
import { ExpenseEntity } from './expense.entity';
import { ExpenseRepository } from './expense.repository';

/**
 * Repository tests against a real (in-memory sqljs) database, so the actual
 * SQL behaviour — filters, pagination, reversals — is exercised.
 */
describe('ExpenseRepository', () => {
  let dataSource: DataSource;
  let repository: ExpenseRepository;
  let recorderId: string;

  beforeAll(async () => {
    dataSource = await createInMemoryDatabase();
    repository = new ExpenseRepository(dataSource.getRepository(ExpenseEntity));

    // Expenses reference the user who recorded them (FK to users).
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

  const newExpense = (overrides: Partial<NewExpense> = {}): NewExpense => ({
    category: ExpenseCategory.TRANSPORT,
    amount: 20000,
    currency: 'RWF',
    description: 'Fuel to a wedding shoot',
    expenseDate: new Date('2026-01-01T00:00:00.000Z'),
    status: ExpenseStatus.RECORDED,
    recordedByUserId: recorderId,
    ...overrides,
  });

  it('creates expenses with generated id and timestamps', async () => {
    const expense = await repository.create(newExpense());

    expect(expense.id).toEqual(expect.any(String));
    expect(expense.createdAt).toBeInstanceOf(Date);
    expect(expense.amount).toBe(20000);
    expect(expense.status).toBe(ExpenseStatus.RECORDED);
  });

  it('paginates and filters by category and status', async () => {
    await repository.create(
      newExpense({ category: ExpenseCategory.RENT, amount: 300000 }),
    );
    await repository.create(
      newExpense({
        category: ExpenseCategory.PRINTING,
        status: ExpenseStatus.REVERSED,
      }),
    );

    const rent = await repository.findAll({ category: ExpenseCategory.RENT });
    expect(rent.data.every((e) => e.category === ExpenseCategory.RENT)).toBe(
      true,
    );

    const reversed = await repository.findAll({
      status: ExpenseStatus.REVERSED,
    });
    expect(
      reversed.data.every((e) => e.status === ExpenseStatus.REVERSED),
    ).toBe(true);

    const page = await repository.findAll({
      category: ExpenseCategory.RENT,
      page: 1,
      limit: 1,
    });
    expect(page.data).toHaveLength(1);
    expect(page.meta.total).toBeGreaterThanOrEqual(1);
  });

  it('filters by creation date range', async () => {
    const expense = await repository.create(
      newExpense({ description: 'dated expense' }),
    );

    const after = await repository.findAll({
      dateFrom: new Date(expense.createdAt.getTime() + 60_000),
    });
    expect(after.data.find((e) => e.id === expense.id)).toBeUndefined();

    const before = await repository.findAll({
      dateFrom: new Date(expense.createdAt.getTime() - 60_000),
    });
    expect(before.data.find((e) => e.id === expense.id)).toBeDefined();
  });

  it('marks an expense reversed without deleting the row', async () => {
    const expense = await repository.create(newExpense());

    const reversed = await repository.reverse(expense.id, {
      reversedAt: new Date('2026-02-01T00:00:00.000Z'),
      reversedByUserId: recorderId,
      reversalReason: 'entered twice',
    });

    expect(reversed.status).toBe(ExpenseStatus.REVERSED);
    expect(reversed.reversalReason).toBe('entered twice');

    // The original row still exists — financial history is never deleted.
    await expect(repository.findById(expense.id)).resolves.not.toBeNull();
  });
});
