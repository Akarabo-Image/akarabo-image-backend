import { Column, Entity } from 'typeorm';
import {
  ExpenseCategory,
  ExpenseStatus,
} from '../../application/expense/expense';
import { BaseEntity } from '../base.entity';

@Entity('expenses')
export class ExpenseEntity extends BaseEntity {
  /** Explicit type needed: enum-typed columns emit `Object` design metadata. */
  @Column({ type: 'varchar', length: 30 })
  category: ExpenseCategory;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column({ length: 3, default: 'RWF' })
  currency: string;

  @Column({ length: 500 })
  description: string;

  /** Driver-agnostic date column (like BaseDate columns elsewhere). */
  @Column()
  expenseDate: Date;

  @Column({ type: 'varchar', length: 20, default: ExpenseStatus.RECORDED })
  status: ExpenseStatus;

  /** Who rang it up — kept even if the account is later deactivated. */
  @Column({ type: 'uuid' })
  recordedByUserId: string;

  /** Reversal bookkeeping: expenses are reversed, never deleted. */
  @Column({ nullable: true })
  reversedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  reversedByUserId?: string;

  @Column({ length: 500, nullable: true })
  reversalReason?: string;
}
