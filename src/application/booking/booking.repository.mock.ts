import { bookingBuilder } from './booking.builder';
import type { Booking } from './booking';
import type {
  BookingPage,
  BookingRepository,
} from './booking.repository.interface';

/**
 * In-memory fake of the booking repository for unit tests.
 * Defaults behave like an empty database; override per test as needed.
 */
export function bookingRepositoryMock(
  overrides: Partial<BookingRepository> = {},
): jest.Mocked<BookingRepository> {
  const emptyPage: BookingPage = {
    data: [],
    meta: { page: 1, limit: 20, total: 0 },
  };
  const sample = bookingBuilder().build();

  // Built without a contextual type so the jest.fn generic chain infers
  // correctly, then cast once to the mocked shape.
  const mock = {
    findAll: jest
      .fn<Promise<BookingPage>, Parameters<BookingRepository['findAll']>>()
      .mockResolvedValue(emptyPage),
    findById: jest
      .fn<Promise<Booking | null>, Parameters<BookingRepository['findById']>>()
      .mockResolvedValue(null),
    create: jest
      .fn<Promise<Booking>, Parameters<BookingRepository['create']>>()
      .mockImplementation((data) =>
        Promise.resolve({
          id: sample.id,
          createdAt: sample.createdAt,
          updatedAt: sample.updatedAt,
          ...data,
        }),
      ),
    update: jest
      .fn<Promise<Booking>, Parameters<BookingRepository['update']>>()
      .mockImplementation((id, updates) =>
        Promise.resolve({ ...sample, id, ...updates }),
      ),
    changeStatus: jest
      .fn<Promise<Booking>, Parameters<BookingRepository['changeStatus']>>()
      .mockImplementation((id, status, change) =>
        Promise.resolve({ ...sample, id, status, ...change }),
      ),
    findActiveByCustomerAndDate: jest
      .fn<
        Promise<Booking | null>,
        Parameters<BookingRepository['findActiveByCustomerAndDate']>
      >()
      .mockResolvedValue(null),
  };

  return Object.assign(
    mock as unknown as jest.Mocked<BookingRepository>,
    overrides,
  );
}
