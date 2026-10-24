import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../../util/roles';
import type { AuthUser } from '../../application/auth-user';
import { AuditServiceImpl } from '../audit/audit.service';
import { InvalidAmountError } from '../../application/invalid-amount.error';
import { InvalidInputError } from '../../application/invalid-input.error';
import { TIME_PROVIDER } from '../../application/time-provider.interface';
import { timeProviderMock } from '../../application/time-provider.mock';
import { customerBuilder } from '../../application/customer/customer.builder';
import { CustomerInactiveError } from '../../application/customer/customer-inactive.error';
import { CustomerNotFoundError } from '../../application/customer/customer-not-found.error';
import { CUSTOMER_REPOSITORY } from '../../application/customer/customer.repository.interface';
import { customerRepositoryMock } from '../../application/customer/customer.repository.mock';
import {
  bookingBuilder,
  BookingBuilder,
} from '../../application/booking/booking.builder';
import {
  BookingServiceType,
  BookingStatus,
} from '../../application/booking/booking';
import { BookingAccessDeniedError } from '../../application/booking/booking-access-denied.error';
import { BookingAlreadyExistsError } from '../../application/booking/booking-already-exists.error';
import { BookingInvalidStatusError } from '../../application/booking/booking-invalid-status.error';
import { BookingNotFoundError } from '../../application/booking/booking-not-found.error';
import { InvalidEventDateError } from '../../application/booking/invalid-event-date.error';
import { BOOKING_REPOSITORY } from '../../application/booking/booking.repository.interface';
import { bookingRepositoryMock } from '../../application/booking/booking.repository.mock';
import { BookingServiceImpl } from './booking.service';

describe('BookingService', () => {
  let service: BookingServiceImpl;
  let bookings: jest.Mocked<ReturnType<typeof bookingRepositoryMock>>;
  let customers: jest.Mocked<ReturnType<typeof customerRepositoryMock>>;
  let audit: { log: jest.Mock };
  let now: Date;

  const manager: AuthUser = {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'manager@akarabo.rw',
    role: Role.MANAGER,
  };
  const cashier: AuthUser = {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'cashier@akarabo.rw',
    role: Role.CASHIER,
  };
  const photographer: AuthUser = {
    id: '44444444-4444-4444-4444-444444444444',
    email: 'photo@akarabo.rw',
    role: Role.PHOTOGRAPHER,
  };

  beforeEach(async () => {
    bookings = bookingRepositoryMock();
    customers = customerRepositoryMock();
    customers.findById.mockResolvedValue(customerBuilder().build());
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    now = new Date('2026-02-01T10:00:00.000Z');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingServiceImpl,
        { provide: BOOKING_REPOSITORY, useValue: bookings },
        { provide: CUSTOMER_REPOSITORY, useValue: customers },
        { provide: TIME_PROVIDER, useValue: timeProviderMock(now) },
        { provide: AuditServiceImpl, useValue: audit },
      ],
    }).compile();

    service = module.get(BookingServiceImpl);
  });

  describe('create', () => {
    const data = {
      customerId: '77777777-4444-4444-4444-444444444444',
      serviceType: BookingServiceType.WEDDING,
      eventDate: '2026-06-20',
      startTime: '10:00',
      venue: 'Kigali Convention Centre',
      expectedGuests: 250,
      priceAmount: 1_200_000,
      notes: 'outdoor ceremony',
    };

    it('creates a pending booking attributed to the actor with RWF default', async () => {
      const booking = await service.create(data, manager);

      const saved = bookings.create.mock.calls[0][0];
      expect(saved.status).toBe(BookingStatus.PENDING);
      expect(saved.createdByUserId).toBe(manager.id);
      expect(saved.priceCurrency).toBe('RWF');
      expect(saved.eventDate).toBe('2026-06-20');
      expect(booking.customerId).toBe(data.customerId);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'BOOKING_CREATED',
          entity: 'Booking',
          userId: manager.id,
        }),
      );
    });

    it('rejects a past event date (400)', async () => {
      await expect(
        service.create({ ...data, eventDate: '2026-01-15' }, manager),
      ).rejects.toThrow(InvalidEventDateError);
      expect(customers.findById).not.toHaveBeenCalled();
      expect(bookings.create).not.toHaveBeenCalled();
    });

    it('rejects a date that is not a real calendar day (400)', async () => {
      await expect(
        service.create({ ...data, eventDate: '2026-02-31' }, manager),
      ).rejects.toThrow(InvalidEventDateError);
      await expect(
        service.create({ ...data, eventDate: 'not-a-date' }, manager),
      ).rejects.toThrow(InvalidEventDateError);
    });

    it('rejects a non-positive price', async () => {
      await expect(
        service.create({ ...data, priceAmount: 0 }, manager),
      ).rejects.toThrow(InvalidAmountError);
      await expect(
        service.create({ ...data, priceAmount: -1000 }, manager),
      ).rejects.toThrow(InvalidAmountError);
      expect(bookings.create).not.toHaveBeenCalled();
    });

    it('rejects a price above the sanity cap', async () => {
      await expect(
        service.create({ ...data, priceAmount: 1_000_000_001 }, manager),
      ).rejects.toThrow(InvalidAmountError);
    });

    it('rejects a blank venue', async () => {
      await expect(
        service.create({ ...data, venue: '   ' }, manager),
      ).rejects.toThrow(InvalidInputError);
    });

    it('throws when the customer does not exist (404)', async () => {
      customers.findById.mockResolvedValue(null);

      await expect(service.create(data, manager)).rejects.toThrow(
        CustomerNotFoundError,
      );
      expect(bookings.create).not.toHaveBeenCalled();
    });

    it('refuses to book a deactivated customer (403)', async () => {
      customers.findById.mockResolvedValue(
        customerBuilder().deactivated().build(),
      );

      await expect(service.create(data, manager)).rejects.toThrow(
        CustomerInactiveError,
      );
      expect(bookings.create).not.toHaveBeenCalled();
    });

    it('rejects a second active booking on the same day (409)', async () => {
      bookings.findActiveByCustomerAndDate.mockResolvedValue(
        bookingBuilder().build(),
      );

      await expect(service.create(data, manager)).rejects.toThrow(
        BookingAlreadyExistsError,
      );
      expect(bookings.create).not.toHaveBeenCalled();
    });

    it('books when the repository reports no active booking that day', async () => {
      // Cancelled bookings never come back from findActiveByCustomerAndDate.
      bookings.findActiveByCustomerAndDate.mockResolvedValue(null);

      await service.create(data, manager);

      expect(bookings.create).toHaveBeenCalled();
    });

    it('refuses cashiers', async () => {
      await expect(service.create(data, cashier)).rejects.toThrow(
        BookingAccessDeniedError,
      );
      expect(customers.findById).not.toHaveBeenCalled();
    });

    it('refuses photographers', async () => {
      await expect(service.create(data, photographer)).rejects.toThrow(
        BookingAccessDeniedError,
      );
    });
  });

  describe('findAll', () => {
    it('applies pagination defaults and delegates the filters', async () => {
      await service.findAll({
        status: BookingStatus.CONFIRMED,
        customerId: '77777777-4444-4444-4444-444444444444',
        eventFrom: '2026-06-01',
        eventTo: '2026-06-30',
      });

      expect(bookings.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20,
          status: BookingStatus.CONFIRMED,
          customerId: '77777777-4444-4444-4444-444444444444',
          eventFrom: '2026-06-01',
          eventTo: '2026-06-30',
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns the booking', async () => {
      const existing = bookingBuilder();
      bookings.findById.mockResolvedValue(existing.build());

      const found = await service.findOne(existing.build().id);

      expect(found.id).toBe(existing.build().id);
    });

    it('throws for an unknown id', async () => {
      await expect(
        service.findOne('99999999-9999-4999-8999-999999999999'),
      ).rejects.toThrow(BookingNotFoundError);
    });
  });

  describe('update', () => {
    it('reschedules and audits before/after', async () => {
      const current = bookingBuilder().build();
      bookings.findById.mockResolvedValue(current);

      const saved = await service.update(
        current.id,
        { eventDate: '2026-07-01' },
        manager,
      );

      expect(bookings.findActiveByCustomerAndDate).toHaveBeenCalledWith(
        current.customerId,
        '2026-07-01',
        current.id,
      );
      expect(bookings.update).toHaveBeenCalledWith(
        current.id,
        expect.objectContaining({ eventDate: '2026-07-01' }),
      );
      expect(saved.eventDate).toBe('2026-07-01');

      type AuditCall = [
        { action: string; changes?: { before?: unknown; after?: unknown } },
      ];
      const [entry] = audit.log.mock.calls[0] as AuditCall;
      expect(entry.action).toBe('BOOKING_UPDATED');
      expect(entry.changes?.before).toBeDefined();
      expect(entry.changes?.after).toBeDefined();
    });

    it('rejects rescheduling into the past (400)', async () => {
      const current = bookingBuilder().build();
      bookings.findById.mockResolvedValue(current);

      await expect(
        service.update(current.id, { eventDate: '2026-01-10' }, manager),
      ).rejects.toThrow(InvalidEventDateError);
      expect(bookings.update).not.toHaveBeenCalled();
    });

    it('rejects a new date that already holds an active booking (409)', async () => {
      const current = bookingBuilder().build();
      bookings.findById.mockResolvedValue(current);
      bookings.findActiveByCustomerAndDate.mockResolvedValue(
        bookingBuilder().withId('aaaaaaaa-1111-4111-8111-111111111111').build(),
      );

      await expect(
        service.update(current.id, { eventDate: '2026-07-01' }, manager),
      ).rejects.toThrow(BookingAlreadyExistsError);
      expect(bookings.update).not.toHaveBeenCalled();
    });

    it('edits other fields without revalidating a stale event date', async () => {
      // The event day may have passed while nobody showed up; editing the
      // venue must not be blocked — only explicit rescheduling is validated.
      const current = bookingBuilder().withEventDate('2026-01-10').build();
      bookings.findById.mockResolvedValue(current);

      await service.update(current.id, { venue: 'New venue' }, manager);

      expect(bookings.update).toHaveBeenCalledWith(
        current.id,
        expect.objectContaining({ venue: 'New venue' }),
      );
    });

    it('rejects a non-positive price', async () => {
      const current = bookingBuilder().build();
      bookings.findById.mockResolvedValue(current);

      await expect(
        service.update(current.id, { priceAmount: 0 }, manager),
      ).rejects.toThrow(InvalidAmountError);
      expect(bookings.update).not.toHaveBeenCalled();
    });

    it('refuses to edit a cancelled booking (409)', async () => {
      const current: BookingBuilder = bookingBuilder().cancelledBy(
        manager.id,
        'changed plans',
      );
      bookings.findById.mockResolvedValue(current.build());

      await expect(
        service.update(current.build().id, { venue: 'X' }, manager),
      ).rejects.toThrow(BookingInvalidStatusError);
      expect(bookings.update).not.toHaveBeenCalled();
    });

    it('refuses to edit a completed booking (409)', async () => {
      const current = bookingBuilder().completed();
      bookings.findById.mockResolvedValue(current.build());

      await expect(
        service.update(current.build().id, { venue: 'X' }, manager),
      ).rejects.toThrow(BookingInvalidStatusError);
    });

    it('refuses cashiers', async () => {
      await expect(
        service.update(
          '88888888-4444-4444-4444-444444444444',
          { venue: 'X' },
          cashier,
        ),
      ).rejects.toThrow(BookingAccessDeniedError);
      expect(bookings.findById).not.toHaveBeenCalled();
    });

    it('throws for an unknown id', async () => {
      await expect(
        service.update('99999999-9999-4999-8999-999999999999', {}, manager),
      ).rejects.toThrow(BookingNotFoundError);
    });
  });

  describe('confirm', () => {
    it('moves pending to confirmed with a timestamp and audits', async () => {
      const current = bookingBuilder().build();
      bookings.findById.mockResolvedValue(current);

      const result = await service.confirm(current.id, manager);

      expect(bookings.changeStatus).toHaveBeenCalledWith(
        current.id,
        BookingStatus.CONFIRMED,
        { confirmedAt: now },
      );
      expect(result.status).toBe(BookingStatus.CONFIRMED);

      type AuditCall = [
        { action: string; changes?: { before?: unknown; after?: unknown } },
      ];
      const [entry] = audit.log.mock.calls[0] as AuditCall;
      expect(entry.action).toBe('BOOKING_CONFIRMED');
      expect(entry.changes?.before).toBeDefined();
      expect(entry.changes?.after).toBeDefined();
    });

    it('refuses to confirm an already confirmed booking (409)', async () => {
      const current: BookingBuilder = bookingBuilder().confirmed();
      bookings.findById.mockResolvedValue(current.build());

      await expect(
        service.confirm(current.build().id, manager),
      ).rejects.toThrow(BookingInvalidStatusError);
      expect(bookings.changeStatus).not.toHaveBeenCalled();
    });

    it('refuses to confirm a cancelled booking (409)', async () => {
      const current = bookingBuilder().cancelledBy(manager.id, 'no show');
      bookings.findById.mockResolvedValue(current.build());

      await expect(
        service.confirm(current.build().id, manager),
      ).rejects.toThrow(BookingInvalidStatusError);
    });

    it('refuses cashiers and photographers', async () => {
      await expect(
        service.confirm('88888888-4444-4444-4444-444444444444', cashier),
      ).rejects.toThrow(BookingAccessDeniedError);
      await expect(
        service.confirm('88888888-4444-4444-4444-444444444444', photographer),
      ).rejects.toThrow(BookingAccessDeniedError);
      expect(bookings.findById).not.toHaveBeenCalled();
    });

    it('throws for an unknown id', async () => {
      await expect(
        service.confirm('99999999-9999-4999-8999-999999999999', manager),
      ).rejects.toThrow(BookingNotFoundError);
    });
  });

  describe('complete', () => {
    it('moves confirmed to completed with a timestamp and audits', async () => {
      const current: BookingBuilder = bookingBuilder().confirmed();
      bookings.findById.mockResolvedValue(current.build());

      const result = await service.complete(current.build().id, manager);

      expect(bookings.changeStatus).toHaveBeenCalledWith(
        current.build().id,
        BookingStatus.COMPLETED,
        { completedAt: now },
      );
      expect(result.status).toBe(BookingStatus.COMPLETED);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'BOOKING_COMPLETED' }),
      );
    });

    it('refuses to complete a pending booking — confirm first (409)', async () => {
      const current = bookingBuilder();
      bookings.findById.mockResolvedValue(current.build());

      await expect(
        service.complete(current.build().id, manager),
      ).rejects.toThrow(BookingInvalidStatusError);
      expect(bookings.changeStatus).not.toHaveBeenCalled();
    });

    it('refuses to complete a cancelled booking (409)', async () => {
      const current = bookingBuilder().cancelledBy(manager.id, 'no show');
      bookings.findById.mockResolvedValue(current.build());

      await expect(
        service.complete(current.build().id, manager),
      ).rejects.toThrow(BookingInvalidStatusError);
    });

    it('refuses cashiers', async () => {
      await expect(
        service.complete('88888888-4444-4444-4444-444444444444', cashier),
      ).rejects.toThrow(BookingAccessDeniedError);
      expect(bookings.findById).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('cancels a confirmed booking with the reason and actor, and audits', async () => {
      const current: BookingBuilder = bookingBuilder().confirmed();
      bookings.findById.mockResolvedValue(current.build());

      const result = await service.cancel(
        current.build().id,
        '  Family moved abroad  ',
        manager,
      );

      expect(bookings.changeStatus).toHaveBeenCalledWith(
        current.build().id,
        BookingStatus.CANCELLED,
        {
          cancelledAt: now,
          cancelledByUserId: manager.id,
          cancellationReason: 'Family moved abroad',
        },
      );
      expect(result.status).toBe(BookingStatus.CANCELLED);

      type AuditCall = [
        { action: string; changes?: { before?: unknown; after?: unknown } },
      ];
      const [entry] = audit.log.mock.calls[0] as AuditCall;
      expect(entry.action).toBe('BOOKING_CANCELLED');
      expect(entry.changes?.before).toBeDefined();
      expect(entry.changes?.after).toBeDefined();
    });

    it('cancels a pending booking too', async () => {
      const current = bookingBuilder();
      bookings.findById.mockResolvedValue(current.build());

      const result = await service.cancel(
        current.build().id,
        'no longer needed',
        manager,
      );

      expect(result.status).toBe(BookingStatus.CANCELLED);
    });

    it('requires a reason (400)', async () => {
      const current = bookingBuilder();
      bookings.findById.mockResolvedValue(current.build());

      await expect(
        service.cancel(current.build().id, '   ', manager),
      ).rejects.toThrow(InvalidInputError);
      expect(bookings.changeStatus).not.toHaveBeenCalled();
    });

    it('refuses to cancel a completed booking (409)', async () => {
      const current = bookingBuilder().completed();
      bookings.findById.mockResolvedValue(current.build());

      await expect(
        service.cancel(current.build().id, 'reason', manager),
      ).rejects.toThrow(BookingInvalidStatusError);
      expect(bookings.changeStatus).not.toHaveBeenCalled();
    });

    it('refuses to cancel the same booking twice (409)', async () => {
      const current = bookingBuilder().cancelledBy(manager.id, 'first try');
      bookings.findById.mockResolvedValue(current.build());

      await expect(
        service.cancel(current.build().id, 'second try', manager),
      ).rejects.toThrow(BookingInvalidStatusError);
    });

    it('refuses cashiers', async () => {
      await expect(
        service.cancel(
          '88888888-4444-4444-4444-444444444444',
          'reason',
          cashier,
        ),
      ).rejects.toThrow(BookingAccessDeniedError);
      expect(bookings.findById).not.toHaveBeenCalled();
    });

    it('throws for an unknown id', async () => {
      await expect(
        service.cancel(
          '99999999-9999-4999-8999-999999999999',
          'reason',
          manager,
        ),
      ).rejects.toThrow(BookingNotFoundError);
    });
  });
});
