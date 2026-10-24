import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../base.entity';

/** A public client message or booking request awaiting studio follow-up. */
@Entity('client_inquiries')
@Index('IDX_client_inquiries_created_at', ['createdAt'])
export class InquiryEntity extends BaseEntity {
  @Column({ length: 200 })
  name: string;

  @Column({ length: 200 })
  email: string;

  @Column({ length: 40 })
  service: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  preferredDate?: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  message?: string;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'uuid', nullable: true })
  readByUserId?: string;

  @Column({ nullable: true })
  readAt?: Date;
}
