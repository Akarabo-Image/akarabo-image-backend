/** Thrown when a user with the same phone already exists (HTTP 409). */
export class DuplicatePhoneError extends Error {
  constructor(phone: string) {
    super(`A user with phone "${phone}" already exists`);
    this.name = 'DuplicatePhoneError';
  }
}
