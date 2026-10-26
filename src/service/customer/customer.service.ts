import { Inject, Injectable } from '@nestjs/common';
import { Role } from '../../util/roles';
import type { AuthUser } from '../../application/auth-user';
import { AuditServiceImpl } from '../audit/audit.service';
import { InvalidInputError } from '../../application/invalid-input.error';
import { CustomerAccessDeniedError } from '../../application/customer/customer-access-denied.error';
import { CustomerNotFoundError } from '../../application/customer/customer-not-found.error';
import type { Customer } from '../../application/customer/customer';
import { CUSTOMER_REPOSITORY } from '../../application/customer/customer.repository.interface';
import type {
  CustomerPage,
  CustomerRepository,
  CustomerSearchQuery,
  CustomerUpdates,
} from '../../application/customer/customer.repository.interface';
import type {
  CreateCustomerData,
  CustomerService,
  UpdateCustomerData,
} from './customer.service.interface';

/** Registering and editing clients changes the CRM — manager/owner only. */
const MANAGE_ROLES: Role[] = [Role.MANAGER, Role.OWNER];
const REGISTER_ROLES: Role[] = [...MANAGE_ROLES, Role.CASHIER, Role.PHOTOGRAPHER];

/**
 * Customer use cases. Business rules live here (active
 * flags, who may edit); all data access goes through the CustomerRepository
 * port, so this class is unit-testable in isolation.
 *
 * Customers are deactivated, never deleted — historical bookings and
 * payments keep referencing them forever.
 */
@Injectable()
export class CustomerServiceImpl implements CustomerService {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customers: CustomerRepository,
    private readonly audit: AuditServiceImpl,
  ) {}

  async create(data: CreateCustomerData, actor: AuthUser): Promise<Customer> {
    if (!REGISTER_ROLES.includes(actor.role)) {
      throw new CustomerAccessDeniedError('Only photographers, cashiers, managers, and the owner can register customers');
    }

    const name = data.name.trim();
    const phone = data.phone.trim();
    if (!name) {
      throw new InvalidInputError('Customer name is required');
    }
    if (!phone) {
      throw new InvalidInputError('Customer phone is required');
    }
    const customer = await this.customers.create({
      name,
      phone,
      email: data.email?.trim() || undefined,
      address: data.address?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      isActive: true,
      createdByUserId: actor.id,
    });

    await this.audit.log({
      userId: actor.id,
      action: 'CUSTOMER_CREATED',
      entity: 'Customer',
      entityId: customer.id,
      changes: { after: customer },
    });

    return customer;
  }

  findAll(query: CustomerSearchQuery): Promise<CustomerPage> {
    return this.customers.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      isActive: query.isActive,
      search: query.search,
    });
  }

  findOne(id: string): Promise<Customer> {
    return this.mustFind(id);
  }

  async update(
    id: string,
    data: UpdateCustomerData,
    actor: AuthUser,
  ): Promise<Customer> {
    this.assertCanManage(actor, 'edit customers');
    const existing = await this.mustFind(id);

    const updates: CustomerUpdates = {};
    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.phone !== undefined) updates.phone = data.phone.trim();
    if (data.email !== undefined)
      updates.email = data.email.trim() || undefined;
    if (data.address !== undefined) {
      updates.address = data.address.trim() || undefined;
    }
    if (data.notes !== undefined)
      updates.notes = data.notes.trim() || undefined;

    if (data.name !== undefined && !updates.name) {
      throw new InvalidInputError('Customer name is required');
    }
    if (data.phone !== undefined && !updates.phone) {
      throw new InvalidInputError('Customer phone is required');
    }
    if (Object.keys(updates).length === 0) {
      return existing;
    }

    const saved = await this.customers.update(id, updates);

    await this.audit.log({
      userId: actor.id,
      action: 'CUSTOMER_UPDATED',
      entity: 'Customer',
      entityId: id,
      changes: { before: existing, after: saved },
    });

    return saved;
  }

  deactivate(id: string, actor: AuthUser): Promise<Customer> {
    return this.setActive(id, false, 'CUSTOMER_DEACTIVATED', actor);
  }

  reactivate(id: string, actor: AuthUser): Promise<Customer> {
    return this.setActive(id, true, 'CUSTOMER_REACTIVATED', actor);
  }

  /** Idempotent flag flip: no-op when already in the requested state. */
  private async setActive(
    id: string,
    isActive: boolean,
    action: string,
    actor: AuthUser,
  ): Promise<Customer> {
    this.assertCanManage(
      actor,
      `${isActive ? 'reactivate' : 'deactivate'} customers`,
    );
    const existing = await this.mustFind(id);
    if (existing.isActive === isActive) {
      return existing;
    }

    const saved = await this.customers.setActive(id, isActive);

    await this.audit.log({
      userId: actor.id,
      action,
      entity: 'Customer',
      entityId: id,
      changes: { before: existing, after: saved },
    });

    return saved;
  }

  private assertCanManage(actor: AuthUser, verb: string): void {
    if (!MANAGE_ROLES.includes(actor.role)) {
      throw new CustomerAccessDeniedError(
        `Only managers and the owner can ${verb}`,
      );
    }
  }

  private async mustFind(id: string): Promise<Customer> {
    const existing = await this.customers.findById(id);
    if (!existing) {
      throw new CustomerNotFoundError(id);
    }
    return existing;
  }
}
