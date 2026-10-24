import { paymentBuilder } from './payment.builder';
import { PaymentStatus } from './payment';
import type { Payment } from './payment';
import type {
  PaymentPage,
  PaymentRepository,
} from './payment.repository.interface';

/**
 * In-memory fake of the payment repository for unit tests.
 * Defaults behave like an empty database; override per test as needed.
 */
export function paymentRepositoryMock(
  overrides: Partial<PaymentRepository> = {},
): jest.Mocked<PaymentRepository> {
  const emptyPage: PaymentPage = {
    data: [],
    meta: { page: 1, limit: 20, total: 0 },
  };
  const sample = paymentBuilder().build();

  // Built without a contextual type so the jest.fn generic chain infers
  // correctly, then cast once to the mocked shape.
  const mock = {
    findAll: jest
      .fn<Promise<PaymentPage>, Parameters<PaymentRepository['findAll']>>()
      .mockResolvedValue(emptyPage),
    findById: jest
      .fn<Promise<Payment | null>, Parameters<PaymentRepository['findById']>>()
      .mockResolvedValue(null),
    findByReference: jest
      .fn<
        Promise<Payment | null>,
        Parameters<PaymentRepository['findByReference']>
      >()
      .mockResolvedValue(null),
    create: jest
      .fn<Promise<Payment>, Parameters<PaymentRepository['create']>>()
      .mockImplementation((data) =>
        Promise.resolve({
          id: sample.id,
          createdAt: sample.createdAt,
          updatedAt: sample.updatedAt,
          ...data,
        }),
      ),
    reverse: jest
      .fn<Promise<Payment>, Parameters<PaymentRepository['reverse']>>()
      .mockImplementation((id, reversal) =>
        Promise.resolve({
          ...sample,
          id,
          status: PaymentStatus.REVERSED,
          reversedAt: reversal.reversedAt,
          reversedByUserId: reversal.reversedByUserId,
          reversalReason: reversal.reversalReason,
        }),
      ),
  };

  return Object.assign(
    mock as unknown as jest.Mocked<PaymentRepository>,
    overrides,
  );
}
