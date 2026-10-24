import { expenseBuilder } from './expense.builder';
import { ExpenseStatus } from './expense';
import type { Expense } from './expense';
import type {
  ExpensePage,
  ExpenseRepository,
} from './expense.repository.interface';

/**
 * In-memory fake of the expense repository for unit tests.
 * Defaults behave like an empty database; override per test as needed.
 */
export function expenseRepositoryMock(
  overrides: Partial<ExpenseRepository> = {},
): jest.Mocked<ExpenseRepository> {
  const emptyPage: ExpensePage = {
    data: [],
    meta: { page: 1, limit: 20, total: 0 },
  };
  const sample = expenseBuilder().build();

  // Built without a contextual type so the jest.fn generic chain infers
  // correctly, then cast once to the mocked shape.
  const mock = {
    findAll: jest
      .fn<Promise<ExpensePage>, Parameters<ExpenseRepository['findAll']>>()
      .mockResolvedValue(emptyPage),
    findById: jest
      .fn<Promise<Expense | null>, Parameters<ExpenseRepository['findById']>>()
      .mockResolvedValue(null),
    create: jest
      .fn<Promise<Expense>, Parameters<ExpenseRepository['create']>>()
      .mockImplementation((data) =>
        Promise.resolve({
          id: sample.id,
          createdAt: sample.createdAt,
          updatedAt: sample.updatedAt,
          ...data,
        }),
      ),
    reverse: jest
      .fn<Promise<Expense>, Parameters<ExpenseRepository['reverse']>>()
      .mockImplementation((id, reversal) =>
        Promise.resolve({
          ...sample,
          id,
          status: ExpenseStatus.REVERSED,
          reversedAt: reversal.reversedAt,
          reversedByUserId: reversal.reversedByUserId,
          reversalReason: reversal.reversalReason,
        }),
      ),
  };

  return Object.assign(
    mock as unknown as jest.Mocked<ExpenseRepository>,
    overrides,
  );
}
