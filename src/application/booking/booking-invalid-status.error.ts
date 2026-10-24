import type { BookingStatus } from './booking';

/**
 * Thrown on an illegal lifecycle transition — confirming a cancelled booking,
 * completing a pending one, cancelling twice, editing a finished one
 * (HTTP 409).
 */
export class BookingInvalidStatusError extends Error {
  constructor(action: string, status: BookingStatus) {
    super(`Cannot ${action} a booking that is ${status}`);
    this.name = 'BookingInvalidStatusError';
  }
}
