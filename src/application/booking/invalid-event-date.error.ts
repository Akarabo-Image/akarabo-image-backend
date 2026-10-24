import { InvalidInputError } from '../invalid-input.error';

/**
 * Thrown when an event date is malformed, not a real calendar day, or in the
 * past (HTTP 400).
 */
export class InvalidEventDateError extends InvalidInputError {
  constructor(eventDate: string) {
    super(
      `Invalid event date "${eventDate}" — must be a real day (yyyy-mm-dd) that is today or later`,
    );
    this.name = 'InvalidEventDateError';
  }
}
