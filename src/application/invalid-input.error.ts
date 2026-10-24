/**
 * Base for "the request itself is wrong" domain errors (HTTP 400). Separate
 * from DTO validation (handled by the global ValidationPipe) — these are
 * business-shape rules, e.g. a date that is not a real calendar day.
 */
export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInputError';
  }
}
