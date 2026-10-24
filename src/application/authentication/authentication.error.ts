/**
 * Thrown when credentials are missing, wrong, or the account is deactivated
 * (HTTP 401). The same error is used for every failure so the API never
 * reveals whether an email exists.
 */
export class AuthenticationError extends Error {
  constructor(message = 'Invalid email or password') {
    super(message);
    this.name = 'AuthenticationError';
  }
}
