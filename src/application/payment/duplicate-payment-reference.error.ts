/** Thrown when the same receipt/mobile-money reference is recorded twice (HTTP 409). */
export class DuplicatePaymentReferenceError extends Error {
  constructor(reference: string) {
    super(`A payment with reference "${reference}" is already recorded`);
    this.name = 'DuplicatePaymentReferenceError';
  }
}
