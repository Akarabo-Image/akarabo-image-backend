import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('customers')
export class CustomerEntity extends BaseEntity {
  /** Contact person or company name. */
  @Column({ length: 200 })
  name: string;

  /** Primary contact number; multiple customers may share a number. */
  @Column({ length: 30 })
  phone: string;

  @Column({ length: 200, nullable: true })
  email?: string;

  @Column({ length: 300, nullable: true })
  address?: string;

  @Column({ length: 1200, nullable: true })
  notes?: string;

  /** Inactive customers cannot be booked — rows are never deleted. */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /** Staff member who registered the client — kept for provenance. */
  @Column({ type: 'uuid' })
  createdByUserId: string;
}
