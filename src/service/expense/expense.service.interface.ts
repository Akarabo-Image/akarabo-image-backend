import type { AuthUser } from '../../application/auth-user';
import type {
  Expense,
  ExpenseCategory,
} from '../../application/expense/expense';
import type {
  ExpensePage,
  ExpenseSearchQuery,
} from '../../application/expense/expense.repository.interface';

/**
 * DI token for the expense service — interfaces have no runtime value, so
 * controllers inject this token and the module binds it to the impl.
 */
export const EXPENSE_SERVICE = Symbol('EXPENSE_SERVICE');

export interface CreateExpenseData {
  category: ExpenseCategory;
  amount: number;
  currency?: string;
  description: string;
  /** Defaults to the recording time when omitted. */
  expenseDate?: Date;
}

/** Expense use cases, consumed by the controller layer. */
export interface ExpenseService {
  create(data: CreateExpenseData, actor: AuthUser): Promise<Expense>;
  findAll(query: ExpenseSearchQuery): Promise<ExpensePage>;
  findOne(id: string): Promise<Expense>;
  reverse(id: string, reason: string, actor: AuthUser): Promise<Expense>;
}
