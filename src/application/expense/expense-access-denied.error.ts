import { AccessDeniedError } from '../access-denied.error';

/** Thrown when a role attempts an expense operation it is not allowed (HTTP 403). */
export class ExpenseAccessDeniedError extends AccessDeniedError {
  constructor(message = 'You are not allowed to manage expenses') {
    super(message);
    this.name = 'ExpenseAccessDeniedError';
  }
}
