import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentNotFoundError } from '../../application/payment/payment-not-found.error';
import { PaymentStatus } from '../../application/payment/payment';
import type { Payment } from '../../application/payment/payment';
import type {
  NewPayment,
  PaymentPage,
  PaymentRepository as PaymentRepositoryPort,
  PaymentReversal,
  PaymentSearchQuery,
} from '../../application/payment/payment.repository.interface';
import { PaymentEntity } from './payment.entity';

/** Entity → domain mapping. */
function toDomain(entity: PaymentEntity): Payment {
  return {
    id: entity.id,
    bookingId: entity.bookingId,
    studioServiceId: entity.studioServiceId,
    // PostgreSQL returns numeric columns as strings — normalize to number.
    amount: Number(entity.amount),
    currency: entity.currency,
    method: entity.method,
    reference: entity.reference,
    notes: entity.notes,
    status: entity.status,
    recordedByUserId: entity.recordedByUserId,
    reversedAt: entity.reversedAt,
    reversedByUserId: entity.reversedByUserId,
    reversalReason: entity.reversalReason,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

/**
 * TypeORM adapter for the payment repository port. All queries (pagination,
 * filters, uniqueness) live here, away from the business logic.
 */
@Injectable()
export class PaymentRepository implements PaymentRepositoryPort {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly payments: Repository<PaymentEntity>,
  ) {}

  async findAll(query: PaymentSearchQuery): Promise<PaymentPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.payments
      .createQueryBuilder('payment')
      .orderBy('payment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) {
      qb.andWhere('payment.status = :status', { status: query.status });
    }
    if (query.method) {
      qb.andWhere('payment.method = :method', { method: query.method });
    }
    if (query.bookingId) {
      qb.andWhere('payment.bookingId = :bookingId', {
        bookingId: query.bookingId,
      });
    }
    if (query.dateFrom) {
      qb.andWhere('payment.createdAt >= :dateFrom', {
        dateFrom: query.dateFrom,
      });
    }
    if (query.dateTo) {
      qb.andWhere('payment.createdAt <= :dateTo', { dateTo: query.dateTo });
    }

    const [rows, total] = await qb.getManyAndCount();
    return { data: rows.map(toDomain), meta: { page, limit, total } };
  }

  async findById(id: string): Promise<Payment | null> {
    const row = await this.payments.findOne({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByReference(reference: string): Promise<Payment | null> {
    const row = await this.payments.findOne({ where: { reference } });
    return row ? toDomain(row) : null;
  }

  async create(data: NewPayment): Promise<Payment> {
    const row = await this.payments.save(this.payments.create(data));
    return toDomain(row);
  }

  async reverse(id: string, reversal: PaymentReversal): Promise<Payment> {
    await this.payments.update(
      { id },
      {
        status: PaymentStatus.REVERSED,
        reversedAt: reversal.reversedAt,
        reversedByUserId: reversal.reversedByUserId,
        reversalReason: reversal.reversalReason,
      },
    );
    const fresh = await this.payments.findOne({ where: { id } });
    if (!fresh) {
      // Financial rows are never deleted — this indicates a race or manual
      // intervention; surface it instead of silently continuing.
      throw new PaymentNotFoundError(id);
    }
    return toDomain(fresh);
  }
}
