import { expenseBuilder } from '../../application/expense/expense.builder';
import { ExpenseStatus } from '../../application/expense/expense';
import type { Expense } from '../../application/expense/expense';
import type { ExpensePage } from '../../application/expense/expense.repository.interface';
import type { ExpenseService } from './expense.service.interface';

/** Stub of the expense service for controller-level tests. */
export function expenseServiceMock(
  overrides: Partial<ExpenseService> = {},
): jest.Mocked<ExpenseService> {
  const sample = expenseBuilder().build();
  const emptyPage: ExpensePage = {
    data: [],
    meta: { page: 1, limit: 20, total: 0 },
  };

  // Built without a contextual type so the jest.fn generic chain infers
  // correctly, then cast once to the mocked shape.
  const mock = {
    create: jest
      .fn<Promise<Expense>, Parameters<ExpenseService['create']>>()
      .mockResolvedValue(sample),
    findAll: jest
      .fn<Promise<ExpensePage>, Parameters<ExpenseService['findAll']>>()
      .mockResolvedValue(emptyPage),
    findOne: jest
      .fn<Promise<Expense>, Parameters<ExpenseService['findOne']>>()
      .mockResolvedValue(sample),
    reverse: jest
      .fn<Promise<Expense>, Parameters<ExpenseService['reverse']>>()
      .mockResolvedValue({ ...sample, status: ExpenseStatus.REVERSED }),
  };

  return Object.assign(
    mock as unknown as jest.Mocked<ExpenseService>,
    overrides,
  );
}
