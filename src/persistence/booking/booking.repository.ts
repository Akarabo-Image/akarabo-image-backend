import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingNotFoundError } from '../../application/booking/booking-not-found.error';
import { BookingStatus } from '../../application/booking/booking';
import type { Booking } from '../../application/booking/booking';
import type {
  BookingPage,
  BookingRepository as BookingRepositoryPort,
  BookingSearchQuery,
  BookingStatusChange,
  BookingUpdates,
  NewBooking,
} from '../../application/booking/booking.repository.interface';
import { BookingEntity } from './booking.entity';

/** Entity → domain mapping. */
function toDomain(entity: BookingEntity): Booking {
  return {
    id: entity.id,
    customerId: entity.customerId,
    serviceType: entity.serviceType,
    eventDate: entity.eventDate,
    startTime: entity.startTime,
    venue: entity.venue,
    expectedGuests: entity.expectedGuests,
    // PostgreSQL returns numeric columns as strings — normalize to number.
    priceAmount: Number(entity.priceAmount),
    priceCurrency: entity.priceCurrency,
    notes: entity.notes,
    status: entity.status,
    createdByUserId: entity.createdByUserId,
    confirmedAt: entity.confirmedAt,
    completedAt: entity.completedAt,
    cancelledAt: entity.cancelledAt,
    cancelledByUserId: entity.cancelledByUserId,
    cancellationReason: entity.cancellationReason,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

/**
 * TypeORM adapter for the booking repository port. All queries (pagination,
 * filters, the one-active-booking-per-day lookup) live here, away from the
 * business logic.
 */
@Injectable()
export class BookingRepository implements BookingRepositoryPort {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
  ) {}

  async findAll(query: BookingSearchQuery): Promise<BookingPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.bookings
      .createQueryBuilder('booking')
      .orderBy('booking.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) {
      qb.andWhere('booking.status = :status', { status: query.status });
    }
    if (query.customerId) {
      qb.andWhere('booking.customerId = :customerId', {
        customerId: query.customerId,
      });
    }
    if (query.serviceType) {
      qb.andWhere('booking.serviceType = :serviceType', {
        serviceType: query.serviceType,
      });
    }
    // eventDate is ISO yyyy-mm-dd text — lexicographic order is date order.
    if (query.eventFrom) {
      qb.andWhere('booking.eventDate >= :eventFrom', {
        eventFrom: query.eventFrom,
      });
    }
    if (query.eventTo) {
      qb.andWhere('booking.eventDate <= :eventTo', { eventTo: query.eventTo });
    }

    const [rows, total] = await qb.getManyAndCount();
    return { data: rows.map(toDomain), meta: { page, limit, total } };
  }

  async findById(id: string): Promise<Booking | null> {
    const row = await this.bookings.findOne({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async create(data: NewBooking): Promise<Booking> {
    const row = await this.bookings.save(this.bookings.create(data));
    return toDomain(row);
  }

  async update(id: string, updates: BookingUpdates): Promise<Booking> {
    await this.bookings.update({ id }, updates);
    const fresh = await this.bookings.findOne({ where: { id } });
    if (!fresh) {
      throw new BookingNotFoundError(id);
    }
    return toDomain(fresh);
  }

  async changeStatus(
    id: string,
    status: BookingStatus,
    change: BookingStatusChange,
  ): Promise<Booking> {
    await this.bookings.update({ id }, { status, ...change });
    const fresh = await this.bookings.findOne({ where: { id } });
    if (!fresh) {
      // Bookings are never deleted — a vanished row means a race or manual
      // intervention; surface it instead of silently continuing.
      throw new BookingNotFoundError(id);
    }
    return toDomain(fresh);
  }

  async findActiveByCustomerAndDate(
    customerId: string,
    eventDate: string,
    excludingBookingId?: string,
  ): Promise<Booking | null> {
    const qb = this.bookings
      .createQueryBuilder('booking')
      .where('booking.customerId = :customerId', { customerId })
      .andWhere('booking.eventDate = :eventDate', { eventDate })
      .andWhere('booking.status != :cancelled', {
        cancelled: BookingStatus.CANCELLED,
      })
      .take(1);

    if (excludingBookingId) {
      qb.andWhere('booking.id != :excludingBookingId', {
        excludingBookingId,
      });
    }

    const row = await qb.getOne();
    return row ? toDomain(row) : null;
  }
}
