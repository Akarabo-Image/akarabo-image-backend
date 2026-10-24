import { AccessDeniedError } from '../access-denied.error';

/** Thrown when a role attempts a booking operation it is not allowed (HTTP 403). */
export class BookingAccessDeniedError extends AccessDeniedError {
  constructor(message = 'You are not allowed to manage bookings') {
    super(message);
    this.name = 'BookingAccessDeniedError';
  }
}
