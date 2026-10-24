/**
 * Thrown when a customer already holds an active (non-cancelled) booking on
 * the requested day (HTTP 409). Cancel the old booking first, or pick
 * another date.
 */
export class BookingAlreadyExistsError extends Error {
  constructor(customerId: string, eventDate: string) {
    super(
      `Customer ${customerId} already has an active booking on ${eventDate}`,
    );
    this.name = 'BookingAlreadyExistsError';
  }
}
