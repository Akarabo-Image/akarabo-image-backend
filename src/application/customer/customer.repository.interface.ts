import type { Customer } from './customer';

export const CUSTOMER_REPOSITORY = 'CUSTOMER_REPOSITORY';

/** Filters accepted by CustomerRepository.findAll. */
export interface CustomerSearchQuery {
  page?: number;
  limit?: number;
  isActive?: boolean;
  /** Free-text match against name / phone / email. */
  search?: string;
}

export interface CustomerPage {
  data: Customer[];
  meta: { page: number; limit: number; total: number };
}

/** Everything decided before insertion (actor set by the service). */
export interface NewCustomer {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  createdByUserId: string;
}

export interface CustomerUpdates {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

/**
 * Data-access contract for customers. Implemented by the TypeORM adapter in
 * src/persistence/customer and mocked in tests via customer.repository.mock.ts.
 */
export interface CustomerRepository {
  findAll(query: CustomerSearchQuery): Promise<CustomerPage>;
  findById(id: string): Promise<Customer | null>;
  /** Used to block two customer records sharing one phone number. */
  findByPhone(phone: string): Promise<Customer | null>;
  create(data: NewCustomer): Promise<Customer>;
  update(id: string, updates: CustomerUpdates): Promise<Customer>;
  /** Flips the active flag — rows are never deleted. */
  setActive(id: string, isActive: boolean): Promise<Customer>;
}
