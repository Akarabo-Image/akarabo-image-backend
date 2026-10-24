import { bookingBuilder } from '../../application/booking/booking.builder';
import type { Booking } from '../../application/booking/booking';
import type { BookingPage } from '../../application/booking/booking.repository.interface';
import type { BookingService } from './booking.service.interface';

/** Stub of the booking service for controller-level tests. */
export function bookingServiceMock(
  overrides: Partial<BookingService> = {},
): jest.Mocked<BookingService> {
  const sample = bookingBuilder().build();
  const emptyPage: BookingPage = {
    data: [],
    meta: { page: 1, limit: 20, total: 0 },
  };

  // Built without a contextual type so the jest.fn generic chain infers
  // correctly, then cast once to the mocked shape.
  const mock = {
    create: jest
      .fn<Promise<Booking>, Parameters<BookingService['create']>>()
      .mockResolvedValue(sample),
    findAll: jest
      .fn<Promise<BookingPage>, Parameters<BookingService['findAll']>>()
      .mockResolvedValue(emptyPage),
    findOne: jest
      .fn<Promise<Booking>, Parameters<BookingService['findOne']>>()
      .mockResolvedValue(sample),
    update: jest
      .fn<Promise<Booking>, Parameters<BookingService['update']>>()
      .mockResolvedValue(sample),
    confirm: jest
      .fn<Promise<Booking>, Parameters<BookingService['confirm']>>()
      .mockResolvedValue(sample),
    complete: jest
      .fn<Promise<Booking>, Parameters<BookingService['complete']>>()
      .mockResolvedValue(sample),
    cancel: jest
      .fn<Promise<Booking>, Parameters<BookingService['cancel']>>()
      .mockResolvedValue(sample),
  };

  return Object.assign(
    mock as unknown as jest.Mocked<BookingService>,
    overrides,
  );
}
