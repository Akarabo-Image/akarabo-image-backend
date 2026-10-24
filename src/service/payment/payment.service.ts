import { Inject, Injectable } from '@nestjs/common';
import { Role } from '../../util/roles';
import type { AuthUser } from '../../application/auth-user';
import { AuditServiceImpl } from '../audit/audit.service';
import { InvalidAmountError } from '../../application/invalid-amount.error';
import { DEFAULT_CURRENCY, MAX_AMOUNT } from '../../application/money';
import { TIME_PROVIDER } from '../../application/time-provider.interface';
import type { TimeProvider } from '../../application/time-provider.interface';
import { DuplicatePaymentReferenceError } from '../../application/payment/duplicate-payment-reference.error';
import { PaymentAccessDeniedError } from '../../application/payment/payment-access-denied.error';
import { PaymentAlreadyReversedError } from '../../application/payment/payment-already-reversed.error';
import { PaymentNotFoundError } from '../../application/payment/payment-not-found.error';
import { PaymentStatus } from '../../application/payment/payment';
import type { Payment } from '../../application/payment/payment';
import { PAYMENT_REPOSITORY } from '../../application/payment/payment.repository.interface';
import type {
  PaymentPage,
  PaymentRepository,
  PaymentSearchQuery,
} from '../../application/payment/payment.repository.interface';
import type {
  CreatePaymentData,
  PaymentService,
} from './payment.service.interface';

/** Reversals change the books — reserved for managers and the owner. */
const REVERSAL_ROLES: Role[] = [Role.MANAGER, Role.OWNER];

/**
 * Payment use cases. Business rules live here; all data access goes through
 * the PaymentRepository port, so this class is unit-testable in isolation.
 */
@Injectable()
export class PaymentServiceImpl implements PaymentService {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
    @Inject(TIME_PROVIDER) private readonly time: TimeProvider,
    private readonly audit: AuditServiceImpl,
  ) {}

  async create(data: CreatePaymentData, actor: AuthUser): Promise<Payment> {
    if (!REVERSAL_ROLES.includes(actor.role) && actor.role !== Role.CASHIER) {
      throw new PaymentAccessDeniedError('Only cashiers, managers, and the owner can record payments');
    }
    if (actor.role === Role.CASHIER && !data.studioServiceId) {
      throw new PaymentAccessDeniedError('Cashier payments must be linked to a studio service');
    }
    if (!(data.amount > 0) || data.amount > MAX_AMOUNT) {
      throw new InvalidAmountError('payment', data.amount);
    }
    if (
      data.reference &&
      (await this.payments.findByReference(data.reference))
    ) {
      throw new DuplicatePaymentReferenceError(data.reference);
    }

    const payment = await this.payments.create({
      bookingId: data.bookingId,
      studioServiceId: data.studioServiceId,
      amount: data.amount,
      currency: data.currency ?? DEFAULT_CURRENCY,
      method: data.method,
      reference: data.reference,
      notes: data.notes,
      status: PaymentStatus.COMPLETED,
      recordedByUserId: actor.id,
    });

    await this.audit.log({
      userId: actor.id,
      action: 'PAYMENT_RECORDED',
      entity: 'Payment',
      entityId: payment.id,
      changes: { after: payment },
    });

    return payment;
  }

  findAll(query: PaymentSearchQuery): Promise<PaymentPage> {
    return this.payments.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      status: query.status,
      method: query.method,
      bookingId: query.bookingId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.payments.findById(id);
    if (!payment) {
      throw new PaymentNotFoundError(id);
    }
    return payment;
  }

  /**
   * Financial records are never deleted: a mistake is reversed with a reason,
   * and the reversal itself is audited.
   */
  async reverse(id: string, reason: string, actor: AuthUser): Promise<Payment> {
    if (!REVERSAL_ROLES.includes(actor.role)) {
      throw new PaymentAccessDeniedError(
        'Only managers and the owner can reverse payments',
      );
    }

    const existing = await this.payments.findById(id);
    if (!existing) {
      throw new PaymentNotFoundError(id);
    }
    if (existing.status !== PaymentStatus.COMPLETED) {
      throw new PaymentAlreadyReversedError(id);
    }

    const saved = await this.payments.reverse(id, {
      reversedAt: this.time.now(),
      reversedByUserId: actor.id,
      reversalReason: reason.trim(),
    });

    await this.audit.log({
      userId: actor.id,
      action: 'PAYMENT_REVERSED',
      entity: 'Payment',
      entityId: id,
      changes: { before: existing, after: saved },
    });

    return saved;
  }
}
