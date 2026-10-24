import { AccessDeniedError } from '../access-denied.error';

/** Thrown when a role attempts a customer operation it is not allowed (HTTP 403). */
export class CustomerAccessDeniedError extends AccessDeniedError {
  constructor(message = 'You are not allowed to manage customers') {
    super(message);
    this.name = 'CustomerAccessDeniedError';
  }
}
