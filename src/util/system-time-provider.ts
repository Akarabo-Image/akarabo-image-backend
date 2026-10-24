import type { TimeProvider } from '../application/time-provider.interface';

/** Production time provider — returns the system clock. */
export class SystemTimeProvider implements TimeProvider {
  now(): Date {
    return new Date();
  }
}
