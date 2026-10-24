import { customerBuilder } from '../../application/customer/customer.builder';
import type { Customer } from '../../application/customer/customer';
import type { CustomerPage } from '../../application/customer/customer.repository.interface';
import type { CustomerService } from './customer.service.interface';

/** Stub of the customer service for controller-level tests. */
export function customerServiceMock(
  overrides: Partial<CustomerService> = {},
): jest.Mocked<CustomerService> {
  const sample = customerBuilder().build();
  const emptyPage: CustomerPage = {
    data: [],
    meta: { page: 1, limit: 20, total: 0 },
  };

  // Built without a contextual type so the jest.fn generic chain infers
  // correctly, then cast once to the mocked shape.
  const mock = {
    create: jest
      .fn<Promise<Customer>, Parameters<CustomerService['create']>>()
      .mockResolvedValue(sample),
    findAll: jest
      .fn<Promise<CustomerPage>, Parameters<CustomerService['findAll']>>()
      .mockResolvedValue(emptyPage),
    findOne: jest
      .fn<Promise<Customer>, Parameters<CustomerService['findOne']>>()
      .mockResolvedValue(sample),
    update: jest
      .fn<Promise<Customer>, Parameters<CustomerService['update']>>()
      .mockResolvedValue(sample),
    deactivate: jest
      .fn<Promise<Customer>, Parameters<CustomerService['deactivate']>>()
      .mockResolvedValue(sample),
    reactivate: jest
      .fn<Promise<Customer>, Parameters<CustomerService['reactivate']>>()
      .mockResolvedValue(sample),
  };

  return Object.assign(
    mock as unknown as jest.Mocked<CustomerService>,
    overrides,
  );
}
