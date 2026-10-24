/** Thrown when a money amount is not positive (or absurdly large) — HTTP 400. */
export class InvalidAmountError extends Error {
  constructor(kind: string, amount: number) {
    super(
      `Invalid ${kind} amount: ${amount} — amounts must be greater than zero`,
    );
    this.name = 'InvalidAmountError';
  }
}
