import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExpenseNotFoundError } from '../../application/expense/expense-not-found.error';
import { ExpenseStatus } from '../../application/expense/expense';
import type { Expense } from '../../application/expense/expense';
import type {
  ExpensePage,
  ExpenseRepository as ExpenseRepositoryPort,
  ExpenseReversal,
  ExpenseSearchQuery,
  NewExpense,
} from '../../application/expense/expense.repository.interface';
import { ExpenseEntity } from './expense.entity';

/** Entity → domain mapping. */
function toDomain(entity: ExpenseEntity): Expense {
  return {
    id: entity.id,
    category: entity.category,
    // PostgreSQL returns numeric columns as strings — normalize to number.
    amount: Number(entity.amount),
    currency: entity.currency,
    description: entity.description,
    expenseDate: entity.expenseDate,
    status: entity.status,
    recordedByUserId: entity.recordedByUserId,
    reversedAt: entity.reversedAt,
    reversedByUserId: entity.reversedByUserId,
    reversalReason: entity.reversalReason,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

/**
 * TypeORM adapter for the expense repository port. All queries (pagination,
 * filters) live here, away from the business logic.
 */
@Injectable()
export class ExpenseRepository implements ExpenseRepositoryPort {
  constructor(
    @InjectRepository(ExpenseEntity)
    private readonly expenses: Repository<ExpenseEntity>,
  ) {}

  async findAll(query: ExpenseSearchQuery): Promise<ExpensePage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.expenses
      .createQueryBuilder('expense')
      .orderBy('expense.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) {
      qb.andWhere('expense.status = :status', { status: query.status });
    }
    if (query.category) {
      qb.andWhere('expense.category = :category', {
        category: query.category,
      });
    }
    if (query.dateFrom) {
      qb.andWhere('expense.createdAt >= :dateFrom', {
        dateFrom: query.dateFrom,
      });
    }
    if (query.dateTo) {
      qb.andWhere('expense.createdAt <= :dateTo', { dateTo: query.dateTo });
    }

    const [rows, total] = await qb.getManyAndCount();
    return { data: rows.map(toDomain), meta: { page, limit, total } };
  }

  async findById(id: string): Promise<Expense | null> {
    const row = await this.expenses.findOne({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async create(data: NewExpense): Promise<Expense> {
    const row = await this.expenses.save(this.expenses.create(data));
    return toDomain(row);
  }

  async reverse(id: string, reversal: ExpenseReversal): Promise<Expense> {
    await this.expenses.update(
      { id },
      {
        status: ExpenseStatus.REVERSED,
        reversedAt: reversal.reversedAt,
        reversedByUserId: reversal.reversedByUserId,
        reversalReason: reversal.reversalReason,
      },
    );
    const fresh = await this.expenses.findOne({ where: { id } });
    if (!fresh) {
      // Financial rows are never deleted — this indicates a race or manual
      // intervention; surface it instead of silently continuing.
      throw new ExpenseNotFoundError(id);
    }
    return toDomain(fresh);
  }
}
