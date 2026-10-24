import type { Payment, PaymentMethod, PaymentStatus } from './payment';

export const PAYMENT_REPOSITORY = 'PAYMENT_REPOSITORY';

/** Filters accepted by PaymentRepository.findAll. */
export interface PaymentSearchQuery {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  method?: PaymentMethod;
  bookingId?: string;
  /** Inclusive bounds on createdAt. */
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaymentPage {
  data: Payment[];
  meta: { page: number; limit: number; total: number };
}

/** Everything decided before insertion (status/actor set by the service). */
export interface NewPayment {
  bookingId?: string;
  studioServiceId?: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  status: PaymentStatus;
  recordedByUserId: string;
}

export interface PaymentReversal {
  reversedAt: Date;
  reversedByUserId: string;
  reversalReason: string;
}

/**
 * Data-access contract for payments. Implemented by the TypeORM adapter in
 * src/persistence/payment and mocked in tests via payment.repository.mock.ts.
 */
export interface PaymentRepository {
  findAll(query: PaymentSearchQuery): Promise<PaymentPage>;
  findById(id: string): Promise<Payment | null>;
  /** Used to block double-entry of the same external receipt. */
  findByReference(reference: string): Promise<Payment | null>;
  create(data: NewPayment): Promise<Payment>;
  /** Marks an existing payment reversed — rows are never deleted. */
  reverse(id: string, reversal: PaymentReversal): Promise<Payment>;
}
