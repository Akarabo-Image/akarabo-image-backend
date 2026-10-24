/**
 * Base error for "record does not exist" (HTTP 404). Activity-specific
 * not-found errors extend this class so a single controller filter can
 * map them all to a 404 response.
 */
export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}
