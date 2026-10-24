import type { AuthUser } from '../../application/auth-user';
import type { Customer } from '../../application/customer/customer';
import type {
  CustomerPage,
  CustomerSearchQuery,
} from '../../application/customer/customer.repository.interface';

/**
 * DI token for the customer service — interfaces have no runtime value, so
 * controllers inject this token and the module binds it to the impl.
 */
export const CUSTOMER_SERVICE = Symbol('CUSTOMER_SERVICE');

export interface CreateCustomerData {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface UpdateCustomerData {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

/** Customer use cases, consumed by the controller layer. */
export interface CustomerService {
  create(data: CreateCustomerData, actor: AuthUser): Promise<Customer>;
  findAll(query: CustomerSearchQuery): Promise<CustomerPage>;
  findOne(id: string): Promise<Customer>;
  update(
    id: string,
    data: UpdateCustomerData,
    actor: AuthUser,
  ): Promise<Customer>;
  /** Deactivation is a flag flip — customer rows are never deleted. */
  deactivate(id: string, actor: AuthUser): Promise<Customer>;
  reactivate(id: string, actor: AuthUser): Promise<Customer>;
}
