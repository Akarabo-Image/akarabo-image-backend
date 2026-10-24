import { Inject, Injectable } from '@nestjs/common';
import { Role } from '../../util/roles';
import type { AuthUser } from '../../application/auth-user';
import { AuditServiceImpl } from '../audit/audit.service';
import { InvalidAmountError } from '../../application/invalid-amount.error';
import { DEFAULT_CURRENCY, MAX_AMOUNT } from '../../application/money';
import { TIME_PROVIDER } from '../../application/time-provider.interface';
import type { TimeProvider } from '../../application/time-provider.interface';
import { ExpenseAccessDeniedError } from '../../application/expense/expense-access-denied.error';
import { ExpenseAlreadyReversedError } from '../../application/expense/expense-already-reversed.error';
import { ExpenseNotFoundError } from '../../application/expense/expense-not-found.error';
import { ExpenseStatus } from '../../application/expense/expense';
import type { Expense } from '../../application/expense/expense';
import { EXPENSE_REPOSITORY } from '../../application/expense/expense.repository.interface';
import type {
  ExpensePage,
  ExpenseRepository,
  ExpenseSearchQuery,
} from '../../application/expense/expense.repository.interface';
import type {
  CreateExpenseData,
  ExpenseService,
} from './expense.service.interface';

/** Reversals change the books — reserved for managers and the owner. */
const REVERSAL_ROLES: Role[] = [Role.MANAGER, Role.OWNER];

/**
 * Expense use cases. Business rules live here; all data access goes through
 * the ExpenseRepository port, so this class is unit-testable in isolation.
 */
@Injectable()
export class ExpenseServiceImpl implements ExpenseService {
  constructor(
    @Inject(EXPENSE_REPOSITORY) private readonly expenses: ExpenseRepository,
    @Inject(TIME_PROVIDER) private readonly time: TimeProvider,
    private readonly audit: AuditServiceImpl,
  ) {}

  async create(data: CreateExpenseData, actor: AuthUser): Promise<Expense> {
    if (!REVERSAL_ROLES.includes(actor.role)) {
      throw new ExpenseAccessDeniedError('Only managers and the owner can record expenses');
    }
    if (!(data.amount > 0) || data.amount > MAX_AMOUNT) {
      throw new InvalidAmountError('expense', data.amount);
    }

    const expense = await this.expenses.create({
      category: data.category,
      amount: data.amount,
      currency: data.currency ?? DEFAULT_CURRENCY,
      description: data.description,
      expenseDate: data.expenseDate ?? this.time.now(),
      status: ExpenseStatus.RECORDED,
      recordedByUserId: actor.id,
    });

    await this.audit.log({
      userId: actor.id,
      action: 'EXPENSE_RECORDED',
      entity: 'Expense',
      entityId: expense.id,
      changes: { after: expense },
    });

    return expense;
  }

  findAll(query: ExpenseSearchQuery): Promise<ExpensePage> {
    return this.expenses.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      status: query.status,
      category: query.category,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });
  }

  async findOne(id: string): Promise<Expense> {
    const expense = await this.expenses.findById(id);
    if (!expense) {
      throw new ExpenseNotFoundError(id);
    }
    return expense;
  }

  /**
   * Financial records are never deleted: a mistake is reversed with a reason,
   * and the reversal itself is audited.
   */
  async reverse(id: string, reason: string, actor: AuthUser): Promise<Expense> {
    if (!REVERSAL_ROLES.includes(actor.role)) {
      throw new ExpenseAccessDeniedError(
        'Only managers and the owner can reverse expenses',
      );
    }

    const existing = await this.expenses.findById(id);
    if (!existing) {
      throw new ExpenseNotFoundError(id);
    }
    if (existing.status !== ExpenseStatus.RECORDED) {
      throw new ExpenseAlreadyReversedError(id);
    }

    const saved = await this.expenses.reverse(id, {
      reversedAt: this.time.now(),
      reversedByUserId: actor.id,
      reversalReason: reason.trim(),
    });

    await this.audit.log({
      userId: actor.id,
      action: 'EXPENSE_REVERSED',
      entity: 'Expense',
      entityId: id,
      changes: { before: existing, after: saved },
    });

    return saved;
  }
}
