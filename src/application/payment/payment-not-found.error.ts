import { NotFoundError } from '../not-found.error';

/** Thrown when a payment id does not exist (HTTP 404). */
export class PaymentNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Payment ${id} not found`);
    this.name = 'PaymentNotFoundError';
  }
}
