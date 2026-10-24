import type { AuthUser } from '../../application/auth-user';
import type {
  Booking,
  BookingServiceType,
} from '../../application/booking/booking';
import type {
  BookingPage,
  BookingSearchQuery,
} from '../../application/booking/booking.repository.interface';

/**
 * DI token for the booking service — interfaces have no runtime value, so
 * controllers inject this token and the module binds it to the impl.
 */
export const BOOKING_SERVICE = Symbol('BOOKING_SERVICE');

export interface CreateBookingData {
  customerId: string;
  serviceType: BookingServiceType;
  /** Event day as yyyy-mm-dd — must be a real day, today or later. */
  eventDate: string;
  /** Optional start time, 24-hour HH:MM. */
  startTime?: string;
  venue: string;
  expectedGuests?: number;
  priceAmount: number;
  priceCurrency?: string;
  notes?: string;
}

export interface UpdateBookingData {
  serviceType?: BookingServiceType;
  /** Reschedule target — must stay a real day, today or later. */
  eventDate?: string;
  startTime?: string;
  venue?: string;
  expectedGuests?: number;
  priceAmount?: number;
  notes?: string;
}

/** Booking use cases, consumed by the controller layer. */
export interface BookingService {
  create(data: CreateBookingData, actor: AuthUser): Promise<Booking>;
  findAll(query: BookingSearchQuery): Promise<BookingPage>;
  findOne(id: string): Promise<Booking>;
  update(
    id: string,
    data: UpdateBookingData,
    actor: AuthUser,
  ): Promise<Booking>;
  /** PENDING → CONFIRMED. */
  confirm(id: string, actor: AuthUser): Promise<Booking>;
  /** CONFIRMED → COMPLETED (the event happened). */
  complete(id: string, actor: AuthUser): Promise<Booking>;
  /**
   * PENDING/CONFIRMED → CANCELLED with a reason — bookings are cancelled,
   * never deleted.
   */
  cancel(id: string, reason: string, actor: AuthUser): Promise<Booking>;
}
