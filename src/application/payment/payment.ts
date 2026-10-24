/** How the money physically arrived. */
export enum PaymentMethod {
  CASH = 'CASH',
  MOBILE_MONEY = 'MOBILE_MONEY',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export enum PaymentStatus {
  COMPLETED = 'COMPLETED',
  REVERSED = 'REVERSED',
}

/**
 * A record of money received by the studio.
 *
 * Financial records are never deleted: an erroneous payment is *reversed*
 * (with a reason and an audit entry) instead, so the books always add up.
 */
export interface Payment {
  id: string;
  /** Booking the money belongs to — wired to the Booking module later. */
  bookingId?: string;
  studioServiceId?: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  /** External receipt / mobile-money transaction id (unique when present). */
  reference?: string;
  notes?: string;
  status: PaymentStatus;
  recordedByUserId: string;
  reversedAt?: Date;
  reversedByUserId?: string;
  reversalReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
