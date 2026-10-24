import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { UserEntity } from '../user/user.entity';

/**
 * Append-only audit trail. Rows are only ever inserted — important actions
 * (logins, financial changes, configuration updates) are recorded here with
 * the user who performed them. Never update or delete rows of this table.
 *
 * Nullable columns are declared optional (`?:`) rather than `| null` so the
 * TypeORM metadata builder can infer their types from the design metadata.
 */
@Entity('audit_logs')
export class AuditLogEntity extends BaseEntity {
  /** User who performed the action (omitted for system-generated entries). */
  @Column({ nullable: true })
  userId?: string;

  /** Verb-like action, e.g. LOGIN, USER_CREATED, PAYMENT_VOIDED. */
  @Column({ length: 50 })
  action: string;

  /** Affected entity/table name, e.g. User, Booking, Payment. */
  @Column({ length: 100 })
  entity: string;

  /** ID of the affected record, when applicable. */
  @Column({ nullable: true })
  entityId?: string;

  /** Snapshot of what changed (before/after), stored as JSON text. */
  @Column({ type: 'simple-json', nullable: true })
  changes?: { before?: unknown; after?: unknown };

  @Column({ length: 45, nullable: true })
  ipAddress?: string;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user?: UserEntity;
}
