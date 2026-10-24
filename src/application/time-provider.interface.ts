export const TIME_PROVIDER = 'TIME_PROVIDER';

/** Abstraction over the system clock so services stay testable. */
export interface TimeProvider {
  now(): Date;
}
