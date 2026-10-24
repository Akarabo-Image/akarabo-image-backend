/** Thrown when reversing a payment that is already reversed (HTTP 409). */
export class PaymentAlreadyReversedError extends Error {
  constructor(id: string) {
    super(`Payment ${id} is already reversed`);
    this.name = 'PaymentAlreadyReversedError';
  }
}
