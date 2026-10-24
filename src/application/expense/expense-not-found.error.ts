import { NotFoundError } from '../not-found.error';

/** Thrown when an expense id does not exist (HTTP 404). */
export class ExpenseNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Expense ${id} not found`);
    this.name = 'ExpenseNotFoundError';
  }
}
