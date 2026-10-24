/** Thrown when two customer records would share one phone number (HTTP 409). */
export class DuplicateCustomerPhoneError extends Error {
  constructor(phone: string) {
    super(`A customer with phone "${phone}" already exists`);
    this.name = 'DuplicateCustomerPhoneError';
  }
}
