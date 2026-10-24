import { PaymentMethod, PaymentStatus } from './payment';
import type { Payment } from './payment';

/**
 * Fluent builder for Payment instances — mainly used by tests to construct
 * payments with only the fields that matter for the scenario.
 */
export class PaymentBuilder {
  private readonly payment: Payment = {
    id: '99999999-4444-4444-4444-444444444444',
    amount: 150000,
    currency: 'RWF',
    method: PaymentMethod.MOBILE_MONEY,
    reference: 'MOMO-0001',
    status: PaymentStatus.COMPLETED,
    recordedByUserId: '33333333-3333-3333-3333-333333333333',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  withId(id: string): this {
    this.payment.id = id;
    return this;
  }

  forBooking(bookingId: string): this {
    this.payment.bookingId = bookingId;
    return this;
  }

  withAmount(amount: number): this {
    this.payment.amount = amount;
    return this;
  }

  withCurrency(currency: string): this {
    this.payment.currency = currency;
    return this;
  }

  withMethod(method: PaymentMethod): this {
    this.payment.method = method;
    return this;
  }

  withReference(reference: string): this {
    this.payment.reference = reference;
    return this;
  }

  withNotes(notes: string): this {
    this.payment.notes = notes;
    return this;
  }

  withStatus(status: PaymentStatus): this {
    this.payment.status = status;
    return this;
  }

  /** Marks the payment reversed with the given actor/reason/time. */
  reversedBy(
    userId: string,
    reason: string,
    at = new Date('2026-01-02T00:00:00.000Z'),
  ): this {
    this.payment.status = PaymentStatus.REVERSED;
    this.payment.reversedByUserId = userId;
    this.payment.reversalReason = reason;
    this.payment.reversedAt = at;
    return this;
  }

  /** Apply arbitrary overrides in one call. */
  with(overrides: Partial<Payment>): this {
    Object.assign(this.payment, overrides);
    return this;
  }

  build(): Payment {
    return { ...this.payment };
  }
}

export function paymentBuilder(): PaymentBuilder {
  return new PaymentBuilder();
}
