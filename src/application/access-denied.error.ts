/**
 * Base error for authorization failures (HTTP 403). Activity-specific
 * access errors extend this class so a single controller filter can map
 * them all to a 403 response.
 */
export class AccessDeniedError extends Error {
  constructor(message = 'You do not have permission to perform this action') {
    super(message);
    this.name = 'AccessDeniedError';
  }
}
