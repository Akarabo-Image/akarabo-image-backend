import { ExpenseCategory, ExpenseStatus } from './expense';
import type { Expense } from './expense';

/**
 * Fluent builder for Expense instances — mainly used by tests to construct
 * expenses with only the fields that matter for the scenario.
 */
export class ExpenseBuilder {
  private readonly expense: Expense = {
    id: '88888888-4444-4444-4444-444444444444',
    category: ExpenseCategory.TRANSPORT,
    amount: 20000,
    currency: 'RWF',
    description: 'Fuel to a wedding shoot in Musanze',
    expenseDate: new Date('2026-01-01T00:00:00.000Z'),
    status: ExpenseStatus.RECORDED,
    recordedByUserId: '33333333-3333-3333-3333-333333333333',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  withId(id: string): this {
    this.expense.id = id;
    return this;
  }

  withCategory(category: ExpenseCategory): this {
    this.expense.category = category;
    return this;
  }

  withAmount(amount: number): this {
    this.expense.amount = amount;
    return this;
  }

  withDescription(description: string): this {
    this.expense.description = description;
    return this;
  }

  withExpenseDate(expenseDate: Date): this {
    this.expense.expenseDate = expenseDate;
    return this;
  }

  withStatus(status: ExpenseStatus): this {
    this.expense.status = status;
    return this;
  }

  /** Marks the expense reversed with the given actor/reason/time. */
  reversedBy(
    userId: string,
    reason: string,
    at = new Date('2026-01-02T00:00:00.000Z'),
  ): this {
    this.expense.status = ExpenseStatus.REVERSED;
    this.expense.reversedByUserId = userId;
    this.expense.reversalReason = reason;
    this.expense.reversedAt = at;
    return this;
  }

  /** Apply arbitrary overrides in one call. */
  with(overrides: Partial<Expense>): this {
    Object.assign(this.expense, overrides);
    return this;
  }

  build(): Expense {
    return { ...this.expense };
  }
}

export function expenseBuilder(): ExpenseBuilder {
  return new ExpenseBuilder();
}
