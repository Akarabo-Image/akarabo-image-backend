import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerNotFoundError } from '../../application/customer/customer-not-found.error';
import type { Customer } from '../../application/customer/customer';
import type {
  CustomerPage,
  CustomerRepository as CustomerRepositoryPort,
  CustomerSearchQuery,
  CustomerUpdates,
  NewCustomer,
} from '../../application/customer/customer.repository.interface';
import { CustomerEntity } from './customer.entity';

/** Entity → domain mapping. */
function toDomain(entity: CustomerEntity): Customer {
  return {
    id: entity.id,
    name: entity.name,
    phone: entity.phone,
    email: entity.email,
    address: entity.address,
    notes: entity.notes,
    isActive: entity.isActive,
    createdByUserId: entity.createdByUserId,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

/**
 * TypeORM adapter for the customer repository port. All queries (pagination,
 * filters, phone uniqueness) live here, away from the business logic.
 */
@Injectable()
export class CustomerRepository implements CustomerRepositoryPort {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customers: Repository<CustomerEntity>,
  ) {}

  async findAll(query: CustomerSearchQuery): Promise<CustomerPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.customers
      .createQueryBuilder('customer')
      .orderBy('customer.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.isActive !== undefined) {
      qb.andWhere('customer.isActive = :isActive', {
        isActive: query.isActive,
      });
    }
    if (query.search) {
      const needle = `%${query.search.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(customer.name) LIKE :needle' +
          ' OR LOWER(customer.phone) LIKE :needle' +
          ' OR LOWER(customer.email) LIKE :needle)',
        { needle },
      );
    }

    const [rows, total] = await qb.getManyAndCount();
    return { data: rows.map(toDomain), meta: { page, limit, total } };
  }

  async findById(id: string): Promise<Customer | null> {
    const row = await this.customers.findOne({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByPhone(phone: string): Promise<Customer | null> {
    const row = await this.customers.findOne({ where: { phone } });
    return row ? toDomain(row) : null;
  }

  async create(data: NewCustomer): Promise<Customer> {
    const row = await this.customers.save(this.customers.create(data));
    return toDomain(row);
  }

  async update(id: string, updates: CustomerUpdates): Promise<Customer> {
    await this.customers.update({ id }, updates);
    const fresh = await this.customers.findOne({ where: { id } });
    if (!fresh) {
      throw new CustomerNotFoundError(id);
    }
    return toDomain(fresh);
  }

  async setActive(id: string, isActive: boolean): Promise<Customer> {
    await this.customers.update({ id }, { isActive });
    const fresh = await this.customers.findOne({ where: { id } });
    if (!fresh) {
      throw new CustomerNotFoundError(id);
    }
    return toDomain(fresh);
  }
}
