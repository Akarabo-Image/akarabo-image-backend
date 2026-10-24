import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../../util/roles';
import type { AuthUser } from '../../application/auth-user';
import { AuditServiceImpl } from '../audit/audit.service';
import { InvalidAmountError } from '../../application/invalid-amount.error';
import { TIME_PROVIDER } from '../../application/time-provider.interface';
import { timeProviderMock } from '../../application/time-provider.mock';
import {
  paymentBuilder,
  PaymentBuilder,
} from '../../application/payment/payment.builder';
import {
  PaymentMethod,
  PaymentStatus,
} from '../../application/payment/payment';
import { DuplicatePaymentReferenceError } from '../../application/payment/duplicate-payment-reference.error';
import { PaymentAccessDeniedError } from '../../application/payment/payment-access-denied.error';
import { PaymentAlreadyReversedError } from '../../application/payment/payment-already-reversed.error';
import { PaymentNotFoundError } from '../../application/payment/payment-not-found.error';
import { PAYMENT_REPOSITORY } from '../../application/payment/payment.repository.interface';
import { paymentRepositoryMock } from '../../application/payment/payment.repository.mock';
import { PaymentServiceImpl } from './payment.service';

describe('PaymentService', () => {
  let service: PaymentServiceImpl;
  let payments: jest.Mocked<ReturnType<typeof paymentRepositoryMock>>;
  let audit: { log: jest.Mock };
  let now: Date;

  const cashier: AuthUser = {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'cashier@akarabo.rw',
    role: Role.CASHIER,
  };
  const manager: AuthUser = {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'manager@akarabo.rw',
    role: Role.MANAGER,
  };
  const photographer: AuthUser = {
    id: '44444444-4444-4444-4444-444444444444',
    email: 'photo@akarabo.rw',
    role: Role.PHOTOGRAPHER,
  };

  beforeEach(async () => {
    payments = paymentRepositoryMock();
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    now = new Date('2026-02-01T10:00:00.000Z');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentServiceImpl,
        { provide: PAYMENT_REPOSITORY, useValue: payments },
        { provide: AuditServiceImpl, useValue: audit },
        { provide: TIME_PROVIDER, useValue: timeProviderMock(now) },
      ],
    }).compile();

    service = module.get(PaymentServiceImpl);
  });

  describe('create', () => {
    const data = {
      amount: 250000,
      method: PaymentMethod.MOBILE_MONEY,
      reference: 'MOMO-77',
      notes: 'booking deposit',
    };

    it('records a completed payment attributed to the actor', async () => {
      const payment = await service.create(data, manager);

      const saved = payments.create.mock.calls[0][0];
      expect(saved.status).toBe(PaymentStatus.COMPLETED);
      expect(saved.recordedByUserId).toBe(manager.id);
      expect(saved.currency).toBe('RWF');
      expect(payment.reference).toBe('MOMO-77');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PAYMENT_RECORDED',
          entity: 'Payment',
          userId: manager.id,
        }),
      );
    });

    it('keeps the booking link when provided', async () => {
      const bookingId = 'bbbbbbbb-1111-1111-1111-111111111111';

      await service.create({ ...data, bookingId }, manager);

      expect(payments.create.mock.calls[0][0].bookingId).toBe(bookingId);
    });

    it('rejects a non-positive amount', async () => {
      await expect(
        service.create({ ...data, amount: 0 }, manager),
      ).rejects.toThrow(InvalidAmountError);
      await expect(
        service.create({ ...data, amount: -500 }, manager),
      ).rejects.toThrow(InvalidAmountError);
      expect(payments.create).not.toHaveBeenCalled();
    });

    it('rejects an amount above the sanity cap', async () => {
      await expect(
        service.create({ ...data, amount: 1_000_000_001 }, manager),
      ).rejects.toThrow(InvalidAmountError);
    });

    it('rejects a receipt reference that is already recorded', async () => {
      payments.findByReference.mockResolvedValue(
        paymentBuilder().withReference('MOMO-77').build(),
      );

      await expect(service.create(data, manager)).rejects.toThrow(
        DuplicatePaymentReferenceError,
      );
      expect(payments.create).not.toHaveBeenCalled();
    });

    it('allows payments without a reference', async () => {
      await service.create(
        { amount: 50000, method: PaymentMethod.CASH },
        manager,
      );

      expect(payments.create).toHaveBeenCalledWith(
        expect.objectContaining({ reference: undefined }),
      );
    });

    it('requires cashier payments to be linked to a studio service', async () => {
      await expect(service.create(data, cashier)).rejects.toThrow(PaymentAccessDeniedError);
      expect(payments.create).not.toHaveBeenCalled();
    });

    it('allows a cashier to record a service-linked payment', async () => {
      await service.create({ ...data, studioServiceId: '55555555-5555-4555-8555-555555555555' }, cashier);
      expect(payments.create).toHaveBeenCalledWith(expect.objectContaining({
        studioServiceId: '55555555-5555-4555-8555-555555555555',
        recordedByUserId: cashier.id,
      }));
    });
  });

  describe('findAll', () => {
    it('applies pagination defaults and delegates the filters', async () => {
      await service.findAll({
        method: PaymentMethod.CASH,
        status: PaymentStatus.COMPLETED,
      });

      expect(payments.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20,
          method: PaymentMethod.CASH,
          status: PaymentStatus.COMPLETED,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns the payment', async () => {
      const existing = paymentBuilder();
      payments.findById.mockResolvedValue(existing.build());

      const found = await service.findOne(existing.build().id);

      expect(found.id).toBe(existing.build().id);
    });

    it('throws for an unknown id', async () => {
      await expect(
        service.findOne('44444444-4444-4444-4444-444444444444'),
      ).rejects.toThrow(PaymentNotFoundError);
    });
  });

  describe('reverse', () => {
    it('reverses with the given reason and audits before/after', async () => {
      const existing: PaymentBuilder = paymentBuilder();
      const existingPayment = existing.build();
      payments.findById.mockResolvedValue(existingPayment);

      const result = await service.reverse(
        existingPayment.id,
        'Wrong amount entered',
        manager,
      );

      expect(result.status).toBe(PaymentStatus.REVERSED);
      expect(result.reversalReason).toBe('Wrong amount entered');
      expect(result.reversedByUserId).toBe(manager.id);
      expect(result.reversedAt).toEqual(now);

      type AuditCall = [
        { action: string; changes?: { before?: unknown; after?: unknown } },
      ];
      const [entry] = audit.log.mock.calls[0] as AuditCall;
      expect(entry.action).toBe('PAYMENT_REVERSED');
      expect(entry.changes?.before).toBeDefined();
      expect(entry.changes?.after).toBeDefined();
    });

    it('refuses cashiers', async () => {
      await expect(
        service.reverse(
          '99999999-4444-4444-4444-444444444444',
          'reason',
          cashier,
        ),
      ).rejects.toThrow(PaymentAccessDeniedError);
    });

    it('refuses photographers', async () => {
      await expect(
        service.reverse(
          '99999999-4444-4444-4444-444444444444',
          'reason',
          photographer,
        ),
      ).rejects.toThrow(PaymentAccessDeniedError);
      expect(payments.findById).not.toHaveBeenCalled();
    });

    it('throws for an unknown id', async () => {
      await expect(
        service.reverse(
          '44444444-4444-4444-4444-444444444444',
          'reason',
          manager,
        ),
      ).rejects.toThrow(PaymentNotFoundError);
    });

    it('refuses to reverse the same payment twice', async () => {
      payments.findById.mockResolvedValue(
        paymentBuilder().reversedBy(manager.id, 'first reversal').build(),
      );

      await expect(
        service.reverse(
          '99999999-4444-4444-4444-444444444444',
          'second try',
          manager,
        ),
      ).rejects.toThrow(PaymentAlreadyReversedError);
      expect(payments.reverse).not.toHaveBeenCalled();
    });
  });
});
