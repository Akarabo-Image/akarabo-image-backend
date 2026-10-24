import type { AuthUser } from '../../application/auth-user';
import type { Payment, PaymentMethod } from '../../application/payment/payment';
import type {
  PaymentPage,
  PaymentSearchQuery,
} from '../../application/payment/payment.repository.interface';

/**
 * DI token for the payment service — interfaces have no runtime value, so
 * controllers inject this token and the module binds it to the impl.
 */
export const PAYMENT_SERVICE = Symbol('PAYMENT_SERVICE');

export interface CreatePaymentData {
  bookingId?: string;
  studioServiceId?: string;
  amount: number;
  currency?: string;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

/** Money-recorded use cases, consumed by the controller layer. */
export interface PaymentService {
  create(data: CreatePaymentData, actor: AuthUser): Promise<Payment>;
  findAll(query: PaymentSearchQuery): Promise<PaymentPage>;
  findOne(id: string): Promise<Payment>;
  reverse(id: string, reason: string, actor: AuthUser): Promise<Payment>;
}
