/** Thrown when a user with the same email already exists (HTTP 409). */
export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`A user with email "${email}" already exists`);
    this.name = 'DuplicateEmailError';
  }
}
