import { paymentBuilder } from '../../application/payment/payment.builder';
import { PaymentStatus } from '../../application/payment/payment';
import type { Payment } from '../../application/payment/payment';
import type { PaymentService } from './payment.service.interface';
import type { PaymentPage } from '../../application/payment/payment.repository.interface';

/** Stub of the payment service for controller-level tests. */
export function paymentServiceMock(
  overrides: Partial<PaymentService> = {},
): jest.Mocked<PaymentService> {
  const sample = paymentBuilder().build();
  const emptyPage: PaymentPage = {
    data: [],
    meta: { page: 1, limit: 20, total: 0 },
  };

  // Built without a contextual type so the jest.fn generic chain infers
  // correctly, then cast once to the mocked shape.
  const mock = {
    create: jest
      .fn<Promise<Payment>, Parameters<PaymentService['create']>>()
      .mockResolvedValue(sample),
    findAll: jest
      .fn<Promise<PaymentPage>, Parameters<PaymentService['findAll']>>()
      .mockResolvedValue(emptyPage),
    findOne: jest
      .fn<Promise<Payment>, Parameters<PaymentService['findOne']>>()
      .mockResolvedValue(sample),
    reverse: jest
      .fn<Promise<Payment>, Parameters<PaymentService['reverse']>>()
      .mockResolvedValue({ ...sample, status: PaymentStatus.REVERSED }),
  };

  return Object.assign(
    mock as unknown as jest.Mocked<PaymentService>,
    overrides,
  );
}
