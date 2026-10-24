/** What the studio spent money on. */
export enum ExpenseCategory {
  TRANSPORT = 'TRANSPORT',
  PROPS = 'PROPS',
  PRINTING = 'PRINTING',
  EQUIPMENT = 'EQUIPMENT',
  RENT = 'RENT',
  UTILITIES = 'UTILITIES',
  MARKETING = 'MARKETING',
  OTHER = 'OTHER',
}

export enum ExpenseStatus {
  RECORDED = 'RECORDED',
  REVERSED = 'REVERSED',
}

/**
 * A record of studio spending (transport, props, printing, ...).
 *
 * Like payments, expenses are never deleted: a mistake is reversed with a
 * reason so the books always add up.
 */
export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  description: string;
  /** When the expense was incurred (defaults to the recording time). */
  expenseDate: Date;
  status: ExpenseStatus;
  recordedByUserId: string;
  reversedAt?: Date;
  reversedByUserId?: string;
  reversalReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
