/** The studio services a booking can cover. */
export enum BookingServiceType {
  WEDDING = 'WEDDING',
  BIRTHDAY = 'BIRTHDAY',
  SHOWER = 'SHOWER',
  EVENT = 'EVENT',
}

export enum BookingStatus {
  /** Recorded, not yet committed by the studio. */
  PENDING = 'PENDING',
  /** Studio committed — crew will show up on the day. */
  CONFIRMED = 'CONFIRMED',
  /** The event happened and the work was delivered. */
  COMPLETED = 'COMPLETED',
  /** Called off — never deleted, the reason is kept forever. */
  CANCELLED = 'CANCELLED',
}

/**
 * A reservation of the studio (crew + coverage) for a client's special day.
 *
 * Bookings are never deleted: a called-off event becomes a CANCELLED booking
 * with a reason and an audit entry, so the schedule always reflects what
 * really happened in the studio.
 */
export interface Booking {
  id: string;
  customerId: string;
  serviceType: BookingServiceType;
  /** Event day as an ISO calendar date (yyyy-mm-dd) — driver-agnostic. */
  eventDate: string;
  /** Optional start time, 24-hour HH:MM. */
  startTime?: string;
  venue: string;
  expectedGuests?: number;
  /** Total agreed package price (money owed, not money received). */
  priceAmount: number;
  priceCurrency: string;
  notes?: string;
  status: BookingStatus;
  /** Staff member who created the booking. */
  createdByUserId: string;
  confirmedAt?: Date;
  completedAt?: Date;
  /** Cancellation bookkeeping — bookings are cancelled, never deleted. */
  cancelledAt?: Date;
  cancelledByUserId?: string;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * True when the string is a real calendar day in yyyy-mm-dd form (rejects
 * both malformed strings and rollovers like 2026-02-31).
 */
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
