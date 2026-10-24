import { DataSource } from 'typeorm';
import { Role } from '../../util/roles';
import {
  BookingServiceType,
  BookingStatus,
} from '../../application/booking/booking';
import type { NewBooking } from '../../application/booking/booking.repository.interface';
import { createInMemoryDatabase } from '../database-connection.mock';
import { UserEntity } from '../user/user.entity';
import { CustomerEntity } from '../customer/customer.entity';
import { BookingEntity } from './booking.entity';
import { BookingRepository } from './booking.repository';

/**
 * Repository tests against a real (in-memory sqljs) database, so the actual
 * SQL behaviour — the partial unique index (one active booking per customer
 * per day), filters, pagination, status moves — is exercised.
 */
describe('BookingRepository', () => {
  let dataSource: DataSource;
  let repository: BookingRepository;
  let managerId: string;
  let customerId: string;
  let otherCustomerId: string;

  beforeAll(async () => {
    dataSource = await createInMemoryDatabase();
    repository = new BookingRepository(dataSource.getRepository(BookingEntity));

    // Bookings reference the staff member who created them and the customer
    // the day is held for (FKs to users and customers).
    const users = dataSource.getRepository(UserEntity);
    const manager = await users.save(
      users.create({
        fullName: 'Repo Manager',
        email: 'manager-book-repo@test.rw',
        passwordHash: 'hashed-password',
        role: Role.MANAGER,
        isActive: true,
      }),
    );
    managerId = manager.id;

    const customers = dataSource.getRepository(CustomerEntity);
    const customer = await customers.save(
      customers.create({
        name: 'Repo Client',
        phone: '+250788000222',
        isActive: true,
        createdByUserId: managerId,
      }),
    );
    customerId = customer.id;
    const other = await customers.save(
      customers.create({
        name: 'Other Repo Client',
        phone: '+250788000333',
        isActive: true,
        createdByUserId: managerId,
      }),
    );
    otherCustomerId = other.id;

    // The schema mock synchronizes from entities, which cannot render a
    // partial index — the real migration creates this exact index, so add
    // it here too and exercise it against the same SQL.
    await dataSource.query(
      `CREATE UNIQUE INDEX "UQ_bookings_customer_active_date"` +
        ` ON "bookings" ("customerId", "eventDate") WHERE "status" <> 'CANCELLED'`,
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  const newBooking = (overrides: Partial<NewBooking> = {}): NewBooking => ({
    customerId,
    serviceType: BookingServiceType.WEDDING,
    eventDate: '2030-06-20',
    startTime: '10:00',
    venue: 'Kigali Convention Centre',
    expectedGuests: 250,
    priceAmount: 1_200_000,
    priceCurrency: 'RWF',
    notes: 'outdoor ceremony',
    status: BookingStatus.PENDING,
    createdByUserId: managerId,
    ...overrides,
  });

  it('inserts the exact booking record', async () => {
    const inserted = await repository.create(newBooking());

    // Read the row back from the database and compare every field — the
    // stored record must be exactly what was handed to the insert.
    const stored = await repository.findById(inserted.id);
    expect(stored).toEqual({
      id: inserted.id,
      customerId,
      serviceType: BookingServiceType.WEDDING,
      eventDate: '2030-06-20',
      startTime: '10:00',
      venue: 'Kigali Convention Centre',
      expectedGuests: 250,
      priceAmount: 1_200_000,
      priceCurrency: 'RWF',
      notes: 'outdoor ceremony',
      status: BookingStatus.PENDING,
      createdByUserId: managerId,
      // Lifecycle columns stay NULL until the move actually happens:
      confirmedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancelledByUserId: null,
      cancellationReason: null,
      createdAt: inserted.createdAt,
      updatedAt: inserted.updatedAt,
    });
  });

  it('leaves unset optional columns as SQL NULL', async () => {
    const inserted = await repository.create({
      customerId,
      serviceType: BookingServiceType.EVENT,
      eventDate: '2030-06-21',
      venue: 'Studio A',
      priceAmount: 50_000,
      priceCurrency: 'RWF',
      status: BookingStatus.PENDING,
      createdByUserId: managerId,
    });

    const stored = await repository.findById(inserted.id);
    expect(stored).toEqual(
      expect.objectContaining({
        startTime: null,
        expectedGuests: null,
        notes: null,
        confirmedAt: null,
        completedAt: null,
        cancelledAt: null,
        cancelledByUserId: null,
        cancellationReason: null,
      }),
    );
  });

  describe('one active booking per customer per day', () => {
    it('rejects a second active booking on the same day', async () => {
      await repository.create(newBooking({ eventDate: '2030-07-15' }));

      await expect(
        repository.create(newBooking({ eventDate: '2030-07-15' })),
      ).rejects.toThrow();
    });

    it('frees the day again once the first booking is cancelled', async () => {
      const first = await repository.create(
        newBooking({ eventDate: '2030-07-16' }),
      );
      await repository.changeStatus(first.id, BookingStatus.CANCELLED, {
        cancelledAt: new Date('2026-02-01T00:00:00.000Z'),
        cancelledByUserId: managerId,
        cancellationReason: 'changed plans',
      });

      const second = await repository.create(
        newBooking({ eventDate: '2030-07-16' }),
      );

      expect(second.status).toBe(BookingStatus.PENDING);
    });

    it('lets another customer book the same day', async () => {
      await repository.create(newBooking({ eventDate: '2030-07-17' }));

      const other = await repository.create(
        newBooking({ eventDate: '2030-07-17', customerId: otherCustomerId }),
      );

      expect(other.customerId).toBe(otherCustomerId);
    });
  });

  describe('findActiveByCustomerAndDate', () => {
    it('finds the day, honours exclusions and skips cancelled bookings', async () => {
      const booking = await repository.create(
        newBooking({ eventDate: '2030-08-01' }),
      );

      const found = await repository.findActiveByCustomerAndDate(
        customerId,
        '2030-08-01',
      );
      expect(found?.id).toBe(booking.id);

      const excluded = await repository.findActiveByCustomerAndDate(
        customerId,
        '2030-08-01',
        booking.id,
      );
      expect(excluded).toBeNull();

      await repository.changeStatus(booking.id, BookingStatus.CANCELLED, {
        cancelledAt: new Date('2026-02-01T00:00:00.000Z'),
        cancelledByUserId: managerId,
        cancellationReason: 'no longer needed',
      });

      await expect(
        repository.findActiveByCustomerAndDate(customerId, '2030-08-01'),
      ).resolves.toBeNull();
    });
  });

  it('paginates and filters by status, customer, service and date range', async () => {
    const confirmed = await repository.create(
      newBooking({ eventDate: '2030-09-01' }),
    );
    await repository.changeStatus(confirmed.id, BookingStatus.CONFIRMED, {
      confirmedAt: new Date('2026-02-01T00:00:00.000Z'),
    });
    await repository.create(
      newBooking({
        serviceType: BookingServiceType.BIRTHDAY,
        eventDate: '2030-09-05',
        venue: 'Hotel des Mille Collines',
      }),
    );

    const pending = await repository.findAll({ status: BookingStatus.PENDING });
    expect(pending.data.every((b) => b.status === BookingStatus.PENDING)).toBe(
      true,
    );

    const mine = await repository.findAll({ customerId });
    expect(mine.data.every((b) => b.customerId === customerId)).toBe(true);

    const weddings = await repository.findAll({
      serviceType: BookingServiceType.WEDDING,
    });
    expect(
      weddings.data.every((b) => b.serviceType === BookingServiceType.WEDDING),
    ).toBe(true);

    // eventDate is stored as ISO text — string range comparison is date order.
    const ranged = await repository.findAll({
      eventFrom: '2030-09-01',
      eventTo: '2030-09-30',
    });
    expect(ranged.data.find((b) => b.id === confirmed.id)).toBeDefined();
    expect(
      ranged.data.find((b) => b.eventDate === '2030-07-15'),
    ).toBeUndefined();

    const page1 = await repository.findAll({ page: 1, limit: 1 });
    expect(page1.data).toHaveLength(1);
    expect(page1.meta.limit).toBe(1);
    expect(page1.meta.total).toBeGreaterThanOrEqual(2);
  });

  it('completes a confirmed booking without deleting the row', async () => {
    const booking = await repository.create(
      newBooking({ eventDate: '2030-10-01' }),
    );

    const completedAt = new Date('2030-10-02T18:00:00.000Z');
    const completed = await repository.changeStatus(
      booking.id,
      BookingStatus.COMPLETED,
      { completedAt },
    );

    expect(completed.status).toBe(BookingStatus.COMPLETED);
    expect(completed.completedAt).toEqual(completedAt);

    // Bookings are never deleted — the row survives with its history.
    await expect(repository.findById(booking.id)).resolves.not.toBeNull();
  });
});
