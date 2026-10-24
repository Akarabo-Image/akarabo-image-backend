import type { Expense, ExpenseCategory, ExpenseStatus } from './expense';

export const EXPENSE_REPOSITORY = 'EXPENSE_REPOSITORY';

/** Filters accepted by ExpenseRepository.findAll. */
export interface ExpenseSearchQuery {
  page?: number;
  limit?: number;
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  /** Inclusive bounds on createdAt. */
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ExpensePage {
  data: Expense[];
  meta: { page: number; limit: number; total: number };
}

/** Everything decided before insertion (status/actor set by the service). */
export interface NewExpense {
  category: ExpenseCategory;
  amount: number;
  currency: string;
  description: string;
  expenseDate: Date;
  status: ExpenseStatus;
  recordedByUserId: string;
}

export interface ExpenseReversal {
  reversedAt: Date;
  reversedByUserId: string;
  reversalReason: string;
}

/**
 * Data-access contract for expenses. Implemented by the TypeORM adapter in
 * src/persistence/expense and mocked in tests via expense.repository.mock.ts.
 */
export interface ExpenseRepository {
  findAll(query: ExpenseSearchQuery): Promise<ExpensePage>;
  findById(id: string): Promise<Expense | null>;
  create(data: NewExpense): Promise<Expense>;
  /** Marks an existing expense reversed — rows are never deleted. */
  reverse(id: string, reversal: ExpenseReversal): Promise<Expense>;
}
