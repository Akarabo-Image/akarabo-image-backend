import { Column, Entity } from 'typeorm';
import {
  BookingServiceType,
  BookingStatus,
} from '../../application/booking/booking';
import { BaseEntity } from '../base.entity';

@Entity('bookings')
export class BookingEntity extends BaseEntity {
  /** Customer the studio holds the day for (FK added by the migration). */
  @Column({ type: 'uuid' })
  customerId: string;

  /** Explicit type needed: enum-typed columns emit `Object` design metadata. */
  @Column({ type: 'varchar', length: 20 })
  serviceType: BookingServiceType;

  /** ISO calendar day (yyyy-mm-dd) stored as text so every driver agrees. */
  @Column({ type: 'varchar', length: 10 })
  eventDate: string;

  /** Optional start time, 24-hour HH:MM. */
  @Column({ length: 5, nullable: true })
  startTime?: string;

  @Column({ length: 300 })
  venue: string;

  @Column({ type: 'int', nullable: true })
  expectedGuests?: number;

  /** Total agreed package price (money owed, not money received). */
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  priceAmount: number;

  @Column({ length: 3, default: 'RWF' })
  priceCurrency: string;

  @Column({ length: 500, nullable: true })
  notes?: string;

  @Column({ type: 'varchar', length: 20, default: BookingStatus.PENDING })
  status: BookingStatus;

  /** Staff member who created the booking — kept for provenance. */
  @Column({ type: 'uuid' })
  createdByUserId: string;

  /** Lifecycle bookkeeping: bookings are cancelled, never deleted. */
  @Column({ nullable: true })
  confirmedAt?: Date;

  @Column({ nullable: true })
  completedAt?: Date;

  @Column({ nullable: true })
  cancelledAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  cancelledByUserId?: string;

  @Column({ length: 500, nullable: true })
  cancellationReason?: string;
}
