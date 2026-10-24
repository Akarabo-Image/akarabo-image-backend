import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../../util/roles';
import type { AuthUser } from '../../application/auth-user';
import { AuditServiceImpl } from '../audit/audit.service';
import { InvalidAmountError } from '../../application/invalid-amount.error';
import { TIME_PROVIDER } from '../../application/time-provider.interface';
import { timeProviderMock } from '../../application/time-provider.mock';
import {
  expenseBuilder,
  ExpenseBuilder,
} from '../../application/expense/expense.builder';
import {
  ExpenseCategory,
  ExpenseStatus,
} from '../../application/expense/expense';
import { ExpenseAccessDeniedError } from '../../application/expense/expense-access-denied.error';
import { ExpenseAlreadyReversedError } from '../../application/expense/expense-already-reversed.error';
import { ExpenseNotFoundError } from '../../application/expense/expense-not-found.error';
import { EXPENSE_REPOSITORY } from '../../application/expense/expense.repository.interface';
import { expenseRepositoryMock } from '../../application/expense/expense.repository.mock';
import { ExpenseServiceImpl } from './expense.service';

describe('ExpenseService', () => {
  let service: ExpenseServiceImpl;
  let expenses: jest.Mocked<ReturnType<typeof expenseRepositoryMock>>;
  let audit: { log: jest.Mock };
  let now: Date;

  const cashier: AuthUser = {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'cashier@akarabo.rw',
    role: Role.CASHIER,
  };
  const manager: AuthUser = {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'manager@akarabo.rw',
    role: Role.MANAGER,
  };

  beforeEach(async () => {
    expenses = expenseRepositoryMock();
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    now = new Date('2026-02-01T10:00:00.000Z');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpenseServiceImpl,
        { provide: EXPENSE_REPOSITORY, useValue: expenses },
        { provide: AuditServiceImpl, useValue: audit },
        { provide: TIME_PROVIDER, useValue: timeProviderMock(now) },
      ],
    }).compile();

    service = module.get(ExpenseServiceImpl);
  });

  describe('create', () => {
    const data = {
      category: ExpenseCategory.PROPS,
      amount: 35000,
      description: 'Balloons and backdrop for a birthday setup',
    };

    it('records the expense attributed to the actor', async () => {
      const expense = await service.create(data, manager);

      const saved = expenses.create.mock.calls[0][0];
      expect(saved.status).toBe(ExpenseStatus.RECORDED);
      expect(saved.recordedByUserId).toBe(manager.id);
      expect(saved.currency).toBe('RWF');
      expect(expense.description).toBe(data.description);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'EXPENSE_RECORDED',
          entity: 'Expense',
          userId: manager.id,
        }),
      );
    });

    it('defaults the expense date to the recording time', async () => {
      await service.create(data, manager);

      expect(expenses.create.mock.calls[0][0].expenseDate).toEqual(now);
    });

    it('keeps the given expense date', async () => {
      const incurred = new Date('2026-01-15T08:30:00.000Z');

      await service.create({ ...data, expenseDate: incurred }, manager);

      expect(expenses.create.mock.calls[0][0].expenseDate).toEqual(incurred);
    });

    it('rejects a non-positive amount', async () => {
      await expect(
        service.create({ ...data, amount: 0 }, manager),
      ).rejects.toThrow(InvalidAmountError);
      await expect(
        service.create({ ...data, amount: -1 }, manager),
      ).rejects.toThrow(InvalidAmountError);
      expect(expenses.create).not.toHaveBeenCalled();
    });

    it('refuses cashiers from recording expenses', async () => {
      await expect(service.create(data, cashier)).rejects.toThrow(ExpenseAccessDeniedError);
      expect(expenses.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('applies pagination defaults and delegates the filters', async () => {
      await service.findAll({ category: ExpenseCategory.RENT });

      expect(expenses.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20,
          category: ExpenseCategory.RENT,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('throws for an unknown id', async () => {
      await expect(
        service.findOne('44444444-4444-4444-4444-444444444444'),
      ).rejects.toThrow(ExpenseNotFoundError);
    });
  });

  describe('reverse', () => {
    it('reverses with the given reason and audits before/after', async () => {
      const existing: ExpenseBuilder = expenseBuilder();
      const existingExpense = existing.build();
      expenses.findById.mockResolvedValue(existingExpense);

      const result = await service.reverse(
        existingExpense.id,
        'Entered twice by mistake',
        manager,
      );

      expect(result.status).toBe(ExpenseStatus.REVERSED);
      expect(result.reversalReason).toBe('Entered twice by mistake');
      expect(result.reversedByUserId).toBe(manager.id);
      expect(result.reversedAt).toEqual(now);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'EXPENSE_REVERSED' }),
      );
    });

    it('refuses cashiers', async () => {
      await expect(
        service.reverse(
          '88888888-4444-4444-4444-444444444444',
          'reason',
          cashier,
        ),
      ).rejects.toThrow(ExpenseAccessDeniedError);
    });

    it('throws for an unknown id', async () => {
      await expect(
        service.reverse(
          '44444444-4444-4444-4444-444444444444',
          'reason',
          manager,
        ),
      ).rejects.toThrow(ExpenseNotFoundError);
    });

    it('refuses to reverse the same expense twice', async () => {
      expenses.findById.mockResolvedValue(
        expenseBuilder().reversedBy(manager.id, 'first reversal').build(),
      );

      await expect(
        service.reverse(
          '88888888-4444-4444-4444-444444444444',
          'second try',
          manager,
        ),
      ).rejects.toThrow(ExpenseAlreadyReversedError);
      expect(expenses.reverse).not.toHaveBeenCalled();
    });
  });
});
