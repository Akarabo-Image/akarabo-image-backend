/** Money defaults shared by every financial activity (payments, expenses). */
export const DEFAULT_CURRENCY = 'RWF';

/** Sanity cap for a single record (~US$1M) — bigger figures are data errors. */
export const MAX_AMOUNT = 1_000_000_000;
