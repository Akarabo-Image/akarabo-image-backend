import type { Booking, BookingServiceType, BookingStatus } from './booking';

export const BOOKING_REPOSITORY = 'BOOKING_REPOSITORY';

/** Filters accepted by BookingRepository.findAll. */
export interface BookingSearchQuery {
  page?: number;
  limit?: number;
  status?: BookingStatus;
  customerId?: string;
  serviceType?: BookingServiceType;
  /** Inclusive bounds on eventDate (ISO yyyy-mm-dd). */
  eventFrom?: string;
  eventTo?: string;
}

export interface BookingPage {
  data: Booking[];
  meta: { page: number; limit: number; total: number };
}

/** Everything decided before insertion (status/actor set by the service). */
export interface NewBooking {
  customerId: string;
  serviceType: BookingServiceType;
  eventDate: string;
  startTime?: string;
  venue: string;
  expectedGuests?: number;
  priceAmount: number;
  priceCurrency: string;
  notes?: string;
  status: BookingStatus;
  createdByUserId: string;
}

export interface BookingUpdates {
  serviceType?: BookingServiceType;
  eventDate?: string;
  startTime?: string;
  venue?: string;
  expectedGuests?: number;
  priceAmount?: number;
  notes?: string;
}

export interface BookingStatusChange {
  confirmedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelledByUserId?: string;
  cancellationReason?: string;
}

/**
 * Data-access contract for bookings. Implemented by the TypeORM adapter in
 * src/persistence/booking and mocked in tests via booking.repository.mock.ts.
 */
export interface BookingRepository {
  findAll(query: BookingSearchQuery): Promise<BookingPage>;
  findById(id: string): Promise<Booking | null>;
  create(data: NewBooking): Promise<Booking>;
  update(id: string, updates: BookingUpdates): Promise<Booking>;
  /** Moves a booking through its lifecycle — rows are never deleted. */
  changeStatus(
    id: string,
    status: BookingStatus,
    change: BookingStatusChange,
  ): Promise<Booking>;
  /** Used to block double-booking one customer on one day. */
  findActiveByCustomerAndDate(
    customerId: string,
    eventDate: string,
    excludingBookingId?: string,
  ): Promise<Booking | null>;
}
