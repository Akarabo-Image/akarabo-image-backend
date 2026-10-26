import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../../util/roles';
import type { AuthUser } from '../../application/auth-user';
import { AuditServiceImpl } from '../audit/audit.service';
import { InvalidInputError } from '../../application/invalid-input.error';
import {
  customerBuilder,
  CustomerBuilder,
} from '../../application/customer/customer.builder';
import { CustomerAccessDeniedError } from '../../application/customer/customer-access-denied.error';
import { CustomerNotFoundError } from '../../application/customer/customer-not-found.error';
import { CUSTOMER_REPOSITORY } from '../../application/customer/customer.repository.interface';
import { customerRepositoryMock } from '../../application/customer/customer.repository.mock';
import { CustomerServiceImpl } from './customer.service';

describe('CustomerService', () => {
  let service: CustomerServiceImpl;
  let customers: jest.Mocked<ReturnType<typeof customerRepositoryMock>>;
  let audit: { log: jest.Mock };

  const manager: AuthUser = {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'manager@akarabo.rw',
    role: Role.MANAGER,
  };
  const cashier: AuthUser = {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'cashier@akarabo.rw',
    role: Role.CASHIER,
  };
  const photographer: AuthUser = {
    id: '44444444-4444-4444-4444-444444444444',
    email: 'photo@akarabo.rw',
    role: Role.PHOTOGRAPHER,
  };

  beforeEach(async () => {
    customers = customerRepositoryMock();
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerServiceImpl,
        { provide: CUSTOMER_REPOSITORY, useValue: customers },
        { provide: AuditServiceImpl, useValue: audit },
      ],
    }).compile();

    service = module.get(CustomerServiceImpl);
  });

  describe('create', () => {
    const data = {
      name: 'Aline Uwase',
      phone: '+250788111222',
      email: 'aline@example.rw',
    };

    it('registers an active customer attributed to the actor', async () => {
      const customer = await service.create(data, manager);

      const saved = customers.create.mock.calls[0][0];
      expect(saved.isActive).toBe(true);
      expect(saved.createdByUserId).toBe(manager.id);
      expect(customer.name).toBe('Aline Uwase');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CUSTOMER_CREATED',
          entity: 'Customer',
          userId: manager.id,
        }),
      );
    });

    it('trims whitespace off the name and phone', async () => {
      await service.create(
        { name: '  Aline Uwase  ', phone: ' +250788111222 ' },
        manager,
      );

      const saved = customers.create.mock.calls[0][0];
      expect(saved.name).toBe('Aline Uwase');
      expect(saved.phone).toBe('+250788111222');
    });

    it('allows a phone number shared with another customer', async () => {
      customers.findByPhone.mockResolvedValue(customerBuilder().build());

      await expect(service.create(data, manager)).resolves.toBeDefined();
      expect(customers.create).toHaveBeenCalled();
    });

    it('rejects blank names and phone numbers', async () => {
      await expect(
        service.create({ ...data, name: '   ' }, manager),
      ).rejects.toThrow(InvalidInputError);
      await expect(
        service.create({ ...data, phone: ' ' }, manager),
      ).rejects.toThrow(InvalidInputError);
      expect(customers.create).not.toHaveBeenCalled();
    });

    it('allows cashiers to register customers', async () => {
      const created = await service.create(data, cashier);
      expect(created.createdByUserId).toBe(cashier.id);
      expect(customers.create).toHaveBeenCalledWith(expect.objectContaining({ createdByUserId: cashier.id }));
    });

    it('refuses photographers', async () => {
      await expect(service.create(data, photographer)).rejects.toThrow(
        CustomerAccessDeniedError,
      );
    });
  });

  describe('findAll', () => {
    it('applies pagination defaults and delegates the filters', async () => {
      await service.findAll({ isActive: true, search: 'aline' });

      expect(customers.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20,
          isActive: true,
          search: 'aline',
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns the customer', async () => {
      const existing: CustomerBuilder = customerBuilder();
      customers.findById.mockResolvedValue(existing.build());

      const found = await service.findOne(existing.build().id);

      expect(found.id).toBe(existing.build().id);
    });

    it('throws for an unknown id', async () => {
      await expect(
        service.findOne('99999999-9999-4999-8999-999999999999'),
      ).rejects.toThrow(CustomerNotFoundError);
    });
  });

  describe('update', () => {
    it('updates provided fields and audits before/after', async () => {
      const current = customerBuilder().build();
      customers.findById.mockResolvedValue(current);

      const saved = await service.update(
        current.id,
        { name: ' Aline U. ', notes: ' updated ' },
        manager,
      );

      expect(customers.update).toHaveBeenCalledWith(current.id, {
        name: 'Aline U.',
        notes: 'updated',
      });
      expect(saved.name).toBe('Aline U.');

      type AuditCall = [
        { action: string; changes?: { before?: unknown; after?: unknown } },
      ];
      const [entry] = audit.log.mock.calls[0] as AuditCall;
      expect(entry.action).toBe('CUSTOMER_UPDATED');
      expect(entry.changes?.before).toBeDefined();
      expect(entry.changes?.after).toBeDefined();
    });

    it('allows changing to a phone number shared with another customer', async () => {
      const current = customerBuilder().build();
      customers.findById.mockResolvedValue(current);
      customers.findByPhone.mockResolvedValue(
        customerBuilder().withPhone('+250788999999').build(),
      );

      await service.update(current.id, { phone: '+250788999999' }, manager);
      expect(customers.update).toHaveBeenCalledWith(current.id, { phone: '+250788999999' });
    });

    it('keeps its own phone when the phone is not being changed', async () => {
      const current = customerBuilder().build();
      customers.findById.mockResolvedValue(current);

      await service.update(current.id, { notes: 'new note' }, manager);

      expect(customers.findByPhone).not.toHaveBeenCalled();
    });

    it('returns the customer untouched when nothing changed', async () => {
      const current = customerBuilder().build();
      customers.findById.mockResolvedValue(current);

      const result = await service.update(current.id, {}, manager);

      expect(result).toEqual(current);
      expect(customers.update).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it('rejects a blank name', async () => {
      const current = customerBuilder().build();
      customers.findById.mockResolvedValue(current);

      await expect(
        service.update(current.id, { name: '  ' }, manager),
      ).rejects.toThrow(InvalidInputError);
      expect(customers.update).not.toHaveBeenCalled();
    });

    it('refuses cashiers', async () => {
      const current = customerBuilder().build();

      await expect(
        service.update(current.id, { name: 'Nope' }, cashier),
      ).rejects.toThrow(CustomerAccessDeniedError);
      expect(customers.findById).not.toHaveBeenCalled();
    });

    it('throws for an unknown id', async () => {
      await expect(
        service.update('99999999-9999-4999-8999-999999999999', {}, manager),
      ).rejects.toThrow(CustomerNotFoundError);
    });
  });

  describe('deactivate / reactivate', () => {
    it('flips the active flag off and audits before/after', async () => {
      const current = customerBuilder().build();
      customers.findById.mockResolvedValue(current);

      const saved = await service.deactivate(current.id, manager);

      expect(customers.setActive).toHaveBeenCalledWith(current.id, false);
      expect(saved.isActive).toBe(false);

      type AuditCall = [
        { action: string; changes?: { before?: unknown; after?: unknown } },
      ];
      const [entry] = audit.log.mock.calls[0] as AuditCall;
      expect(entry.action).toBe('CUSTOMER_DEACTIVATED');
      expect(entry.changes?.before).toBeDefined();
      expect(entry.changes?.after).toBeDefined();
    });

    it('is a no-op when the customer is already deactivated', async () => {
      const current = customerBuilder().deactivated().build();
      customers.findById.mockResolvedValue(current);

      const saved = await service.deactivate(current.id, manager);

      expect(saved).toEqual(current);
      expect(customers.setActive).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it('reactivates a deactivated customer', async () => {
      const current = customerBuilder().deactivated().build();
      customers.findById.mockResolvedValue(current);

      const saved = await service.reactivate(current.id, manager);

      expect(customers.setActive).toHaveBeenCalledWith(current.id, true);
      expect(saved.isActive).toBe(true);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CUSTOMER_REACTIVATED',
          userId: manager.id,
        }),
      );
    });

    it('refuses cashiers', async () => {
      await expect(
        service.deactivate('77777777-4444-4444-4444-444444444444', cashier),
      ).rejects.toThrow(CustomerAccessDeniedError);
      expect(customers.findById).not.toHaveBeenCalled();
    });

    it('throws for an unknown id', async () => {
      await expect(
        service.deactivate('99999999-9999-4999-8999-999999999999', manager),
      ).rejects.toThrow(CustomerNotFoundError);
    });
  });
});
