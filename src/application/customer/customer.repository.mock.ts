import { customerBuilder } from './customer.builder';
import type { Customer } from './customer';
import type {
  CustomerPage,
  CustomerRepository,
} from './customer.repository.interface';

/**
 * In-memory fake of the customer repository for unit tests.
 * Defaults behave like an empty database; override per test as needed.
 */
export function customerRepositoryMock(
  overrides: Partial<CustomerRepository> = {},
): jest.Mocked<CustomerRepository> {
  const emptyPage: CustomerPage = {
    data: [],
    meta: { page: 1, limit: 20, total: 0 },
  };
  const sample = customerBuilder().build();

  // Built without a contextual type so the jest.fn generic chain infers
  // correctly, then cast once to the mocked shape.
  const mock = {
    findAll: jest
      .fn<Promise<CustomerPage>, Parameters<CustomerRepository['findAll']>>()
      .mockResolvedValue(emptyPage),
    findById: jest
      .fn<
        Promise<Customer | null>,
        Parameters<CustomerRepository['findById']>
      >()
      .mockResolvedValue(null),
    findByPhone: jest
      .fn<
        Promise<Customer | null>,
        Parameters<CustomerRepository['findByPhone']>
      >()
      .mockResolvedValue(null),
    create: jest
      .fn<Promise<Customer>, Parameters<CustomerRepository['create']>>()
      .mockImplementation((data) =>
        Promise.resolve({
          id: sample.id,
          createdAt: sample.createdAt,
          updatedAt: sample.updatedAt,
          ...data,
        }),
      ),
    update: jest
      .fn<Promise<Customer>, Parameters<CustomerRepository['update']>>()
      .mockImplementation((id, updates) =>
        Promise.resolve({ ...sample, id, ...updates }),
      ),
    setActive: jest
      .fn<Promise<Customer>, Parameters<CustomerRepository['setActive']>>()
      .mockImplementation((id, isActive) =>
        Promise.resolve({ ...sample, id, isActive }),
      ),
  };

  return Object.assign(
    mock as unknown as jest.Mocked<CustomerRepository>,
    overrides,
  );
}
