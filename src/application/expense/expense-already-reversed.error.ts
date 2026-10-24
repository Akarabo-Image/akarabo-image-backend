/** Thrown when reversing an expense that is already reversed (HTTP 409). */
export class ExpenseAlreadyReversedError extends Error {
  constructor(id: string) {
    super(`Expense ${id} is already reversed`);
    this.name = 'ExpenseAlreadyReversedError';
  }
}
