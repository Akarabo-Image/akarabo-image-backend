import type { TimeProvider } from './time-provider.interface';

/** Deterministic clock for unit tests. */
export function timeProviderMock(
  now = new Date('2026-01-01T00:00:00.000Z'),
): TimeProvider {
  return { now: () => now };
}
