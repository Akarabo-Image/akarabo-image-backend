import { Inject, Injectable } from '@nestjs/common';
import { Role } from '../../util/roles';
import type { AuthUser } from '../../application/auth-user';
import { AuditServiceImpl } from '../audit/audit.service';
import { InvalidAmountError } from '../../application/invalid-amount.error';
import { InvalidInputError } from '../../application/invalid-input.error';
import { DEFAULT_CURRENCY, MAX_AMOUNT } from '../../application/money';
import { TIME_PROVIDER } from '../../application/time-provider.interface';
import type { TimeProvider } from '../../application/time-provider.interface';
import { CustomerInactiveError } from '../../application/customer/customer-inactive.error';
import { CustomerNotFoundError } from '../../application/customer/customer-not-found.error';
import { CUSTOMER_REPOSITORY } from '../../application/customer/customer.repository.interface';
import type { CustomerRepository } from '../../application/customer/customer.repository.interface';
import { BookingAccessDeniedError } from '../../application/booking/booking-access-denied.error';
import { BookingAlreadyExistsError } from '../../application/booking/booking-already-exists.error';
import { BookingInvalidStatusError } from '../../application/booking/booking-invalid-status.error';
import { BookingNotFoundError } from '../../application/booking/booking-not-found.error';
import { InvalidEventDateError } from '../../application/booking/invalid-event-date.error';
import { isCalendarDate } from '../../application/booking/booking';
import { BookingStatus } from '../../application/booking/booking';
import type { Booking } from '../../application/booking/booking';
import { BOOKING_REPOSITORY } from '../../application/booking/booking.repository.interface';
import type {
  BookingPage,
  BookingRepository,
  BookingSearchQuery,
  BookingUpdates,
} from '../../application/booking/booking.repository.interface';
import type {
  BookingService,
  CreateBookingData,
  UpdateBookingData,
} from './booking.service.interface';

/** Creating, editing and moving bookings — manager/owner only. */
const MANAGE_ROLES: Role[] = [Role.MANAGER, Role.OWNER];

/**
 * Booking use cases. Business rules live here (active customer required,
 * future event dates, one active booking per customer per day, legal status
 * transitions); all data access goes through the BookingRepository port, so
 * this class is unit-testable in isolation.
 *
 * Bookings are never deleted: a called-off event becomes CANCELLED with a
 * reason and an audit entry.
 */
@Injectable()
export class BookingServiceImpl implements BookingService {
  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookings: BookingRepository,
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customers: CustomerRepository,
    @Inject(TIME_PROVIDER) private readonly time: TimeProvider,
    private readonly audit: AuditServiceImpl,
  ) {}

  async create(data: CreateBookingData, actor: AuthUser): Promise<Booking> {
    this.assertCanManage(actor, 'create bookings');

    const eventDate = data.eventDate?.trim() ?? '';
    this.assertBookableDate(eventDate);
    this.assertPrice(data.priceAmount);
    const venue = data.venue?.trim() ?? '';
    if (!venue) {
      throw new InvalidInputError('Booking venue is required');
    }

    // The client must exist and be active before the studio commits a day.
    const customer = await this.customers.findById(data.customerId);
    if (!customer) {
      throw new CustomerNotFoundError(data.customerId);
    }
    if (!customer.isActive) {
      throw new CustomerInactiveError(customer.id);
    }

    if (
      await this.bookings.findActiveByCustomerAndDate(customer.id, eventDate)
    ) {
      throw new BookingAlreadyExistsError(customer.id, eventDate);
    }

    const booking = await this.bookings.create({
      customerId: customer.id,
      serviceType: data.serviceType,
      eventDate,
      startTime: data.startTime?.trim() || undefined,
      venue,
      expectedGuests: data.expectedGuests,
      priceAmount: data.priceAmount,
      priceCurrency: data.priceCurrency ?? DEFAULT_CURRENCY,
      notes: data.notes?.trim() || undefined,
      status: BookingStatus.PENDING,
      createdByUserId: actor.id,
    });

    await this.audit.log({
      userId: actor.id,
      action: 'BOOKING_CREATED',
      entity: 'Booking',
      entityId: booking.id,
      changes: { after: booking },
    });

    return booking;
  }

  findAll(query: BookingSearchQuery): Promise<BookingPage> {
    return this.bookings.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      status: query.status,
      customerId: query.customerId,
      serviceType: query.serviceType,
      eventFrom: query.eventFrom,
      eventTo: query.eventTo,
    });
  }

  findOne(id: string): Promise<Booking> {
    return this.mustFind(id);
  }

  async update(
    id: string,
    data: UpdateBookingData,
    actor: AuthUser,
  ): Promise<Booking> {
    this.assertCanManage(actor, 'edit bookings');
    const existing = await this.mustFind(id);
    this.assertEditable(existing);

    if (data.priceAmount !== undefined) {
      this.assertPrice(data.priceAmount);
    }

    let eventDate = existing.eventDate;
    if (data.eventDate !== undefined) {
      eventDate = data.eventDate.trim();
      this.assertBookableDate(eventDate);
      if (eventDate !== existing.eventDate) {
        const clash = await this.bookings.findActiveByCustomerAndDate(
          existing.customerId,
          eventDate,
          id,
        );
        if (clash) {
          throw new BookingAlreadyExistsError(existing.customerId, eventDate);
        }
      }
    }

    const updates: BookingUpdates = {
      serviceType: data.serviceType ?? existing.serviceType,
      eventDate,
      startTime: data.startTime?.trim() || existing.startTime,
      venue: data.venue?.trim() || existing.venue,
      expectedGuests: data.expectedGuests ?? existing.expectedGuests,
      priceAmount: data.priceAmount ?? existing.priceAmount,
      notes:
        data.notes !== undefined
          ? data.notes.trim() || undefined
          : existing.notes,
    };

    const saved = await this.bookings.update(id, updates);

    await this.audit.log({
      userId: actor.id,
      action: 'BOOKING_UPDATED',
      entity: 'Booking',
      entityId: id,
      changes: { before: existing, after: saved },
    });

    return saved;
  }

  async confirm(id: string, actor: AuthUser): Promise<Booking> {
    this.assertCanManage(actor, 'confirm bookings');
    const existing = await this.mustFind(id);
    if (existing.status !== BookingStatus.PENDING) {
      throw new BookingInvalidStatusError('confirm', existing.status);
    }

    const saved = await this.bookings.changeStatus(
      id,
      BookingStatus.CONFIRMED,
      {
        confirmedAt: this.time.now(),
      },
    );

    await this.audit.log({
      userId: actor.id,
      action: 'BOOKING_CONFIRMED',
      entity: 'Booking',
      entityId: id,
      changes: { before: existing, after: saved },
    });

    return saved;
  }

  async complete(id: string, actor: AuthUser): Promise<Booking> {
    this.assertCanManage(actor, 'complete bookings');
    const existing = await this.mustFind(id);
    // A booking must be committed (confirmed) before it can be finished.
    if (existing.status !== BookingStatus.CONFIRMED) {
      throw new BookingInvalidStatusError('complete', existing.status);
    }

    const saved = await this.bookings.changeStatus(
      id,
      BookingStatus.COMPLETED,
      {
        completedAt: this.time.now(),
      },
    );

    await this.audit.log({
      userId: actor.id,
      action: 'BOOKING_COMPLETED',
      entity: 'Booking',
      entityId: id,
      changes: { before: existing, after: saved },
    });

    return saved;
  }

  async cancel(id: string, reason: string, actor: AuthUser): Promise<Booking> {
    this.assertCanManage(actor, 'cancel bookings');
    const existing = await this.mustFind(id);
    if (
      existing.status !== BookingStatus.PENDING &&
      existing.status !== BookingStatus.CONFIRMED
    ) {
      throw new BookingInvalidStatusError('cancel', existing.status);
    }
    const cancellationReason = reason.trim();
    if (!cancellationReason) {
      throw new InvalidInputError('A cancellation reason is required');
    }

    const saved = await this.bookings.changeStatus(
      id,
      BookingStatus.CANCELLED,
      {
        cancelledAt: this.time.now(),
        cancelledByUserId: actor.id,
        cancellationReason,
      },
    );

    await this.audit.log({
      userId: actor.id,
      action: 'BOOKING_CANCELLED',
      entity: 'Booking',
      entityId: id,
      changes: { before: existing, after: saved },
    });

    return saved;
  }

  /** Rescheduling a cancelled/finished booking would rewrite history. */
  private assertEditable(booking: Booking): void {
    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      throw new BookingInvalidStatusError('edit', booking.status);
    }
  }

  /** A booking day must be a real calendar day, today or later. */
  private assertBookableDate(eventDate: string): void {
    if (!isCalendarDate(eventDate)) {
      throw new InvalidEventDateError(eventDate);
    }
    const today = this.time.now().toISOString().slice(0, 10);
    if (eventDate < today) {
      throw new InvalidEventDateError(eventDate);
    }
  }

  private assertPrice(priceAmount: number): void {
    if (!(priceAmount > 0) || priceAmount > MAX_AMOUNT) {
      throw new InvalidAmountError('booking price', priceAmount);
    }
  }

  private assertCanManage(actor: AuthUser, verb: string): void {
    if (!MANAGE_ROLES.includes(actor.role)) {
      throw new BookingAccessDeniedError(
        `Only managers and the owner can ${verb}`,
      );
    }
  }

  private async mustFind(id: string): Promise<Booking> {
    const existing = await this.bookings.findById(id);
    if (!existing) {
      throw new BookingNotFoundError(id);
    }
    return existing;
  }
}
