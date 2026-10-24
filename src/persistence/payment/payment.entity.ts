import { Column, Entity, Index } from 'typeorm';
import {
  PaymentMethod,
  PaymentStatus,
} from '../../application/payment/payment';
import { BaseEntity } from '../base.entity';

@Entity('payments')
@Index('UQ_payments_reference', ['reference'], { unique: true })
export class PaymentEntity extends BaseEntity {
  /**
   * Booking this money belongs to. Nullable until the Booking module ships
   * and adds the foreign key.
   */
  @Column({ type: 'uuid', nullable: true })
  bookingId?: string;

  @Column({ type: 'uuid', nullable: true })
  studioServiceId?: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column({ length: 3, default: 'RWF' })
  currency: string;

  /** Explicit type needed: enum-typed columns emit `Object` design metadata. */
  @Column({ type: 'varchar', length: 20 })
  method: PaymentMethod;

  /** External receipt / mobile-money id — unique across the system. */
  @Column({ length: 120, nullable: true })
  reference?: string;

  @Column({ length: 500, nullable: true })
  notes?: string;

  @Column({ type: 'varchar', length: 20, default: PaymentStatus.COMPLETED })
  status: PaymentStatus;

  /** Who rang it up — kept even if the account is later deactivated. */
  @Column({ type: 'uuid' })
  recordedByUserId: string;

  /** Reversal bookkeeping: payments are reversed, never deleted. */
  @Column({ nullable: true })
  reversedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  reversedByUserId?: string;

  @Column({ length: 500, nullable: true })
  reversalReason?: string;
}
