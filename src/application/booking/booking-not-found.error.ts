import { NotFoundError } from '../not-found.error';

/** Thrown when a booking id does not exist (HTTP 404). */
export class BookingNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Booking ${id} not found`);
    this.name = 'BookingNotFoundError';
  }
}
