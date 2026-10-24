import { BookingServiceType, BookingStatus } from './booking';
import type { Booking } from './booking';

/**
 * Fluent builder for Booking instances — mainly used by tests to construct
 * bookings with only the fields that matter for the scenario.
 */
export class BookingBuilder {
  private readonly booking: Booking = {
    id: '88888888-4444-4444-4444-444444444444',
    customerId: '77777777-4444-4444-4444-444444444444',
    serviceType: BookingServiceType.WEDDING,
    eventDate: '2026-06-20',
    startTime: '10:00',
    venue: 'Kigali Convention Centre',
    expectedGuests: 250,
    priceAmount: 1_200_000,
    priceCurrency: 'RWF',
    notes: 'Outdoor ceremony preferred',
    status: BookingStatus.PENDING,
    createdByUserId: '33333333-3333-3333-3333-333333333333',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  withId(id: string): this {
    this.booking.id = id;
    return this;
  }

  forCustomer(customerId: string): this {
    this.booking.customerId = customerId;
    return this;
  }

  withServiceType(serviceType: BookingServiceType): this {
    this.booking.serviceType = serviceType;
    return this;
  }

  withEventDate(eventDate: string): this {
    this.booking.eventDate = eventDate;
    return this;
  }

  withStartTime(startTime: string): this {
    this.booking.startTime = startTime;
    return this;
  }

  withVenue(venue: string): this {
    this.booking.venue = venue;
    return this;
  }

  withGuests(expectedGuests: number): this {
    this.booking.expectedGuests = expectedGuests;
    return this;
  }

  withPrice(priceAmount: number): this {
    this.booking.priceAmount = priceAmount;
    return this;
  }

  withNotes(notes: string): this {
    this.booking.notes = notes;
    return this;
  }

  withStatus(status: BookingStatus): this {
    this.booking.status = status;
    return this;
  }

  confirmed(at: Date = new Date('2026-01-02T00:00:00.000Z')): this {
    this.booking.status = BookingStatus.CONFIRMED;
    this.booking.confirmedAt = at;
    return this;
  }

  completed(at: Date = new Date('2026-06-21T00:00:00.000Z')): this {
    this.booking.status = BookingStatus.COMPLETED;
    this.booking.completedAt = at;
    return this;
  }

  cancelledBy(
    userId: string,
    reason: string,
    at: Date = new Date('2026-01-03T00:00:00.000Z'),
  ): this {
    this.booking.status = BookingStatus.CANCELLED;
    this.booking.cancelledAt = at;
    this.booking.cancelledByUserId = userId;
    this.booking.cancellationReason = reason;
    return this;
  }

  /** Apply arbitrary overrides in one call. */
  with(overrides: Partial<Booking>): this {
    Object.assign(this.booking, overrides);
    return this;
  }

  build(): Booking {
    return { ...this.booking };
  }
}

export function bookingBuilder(): BookingBuilder {
  return new BookingBuilder();
}
