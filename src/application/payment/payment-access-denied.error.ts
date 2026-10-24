import { AccessDeniedError } from '../access-denied.error';

/** Thrown when a role attempts a payment operation it is not allowed (HTTP 403). */
export class PaymentAccessDeniedError extends AccessDeniedError {
  constructor(message = 'You are not allowed to manage payments') {
    super(message);
    this.name = 'PaymentAccessDeniedError';
  }
}
