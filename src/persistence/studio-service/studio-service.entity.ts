import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../base.entity';

export enum StudioServiceStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  SERVED = 'SERVED',
}

@Entity('studio_services')
@Index('IDX_studio_services_day', ['serviceDate'])
export class StudioServiceEntity extends BaseEntity {
  @Column({ type: 'uuid' })
  customerId: string;

  @Column({ type: 'varchar', length: 10 })
  serviceDate: string;

  @Column({ type: 'int', default: 0 })
  photosTaken: number;

  @Column({ type: 'int', default: 0 })
  softPhotos: number;

  @Column({ type: 'int', default: 0 })
  hardPhotos: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  totalAmount: number;

  @Column({ type: 'varchar', length: 20, default: StudioServiceStatus.IN_PROGRESS })
  status: StudioServiceStatus;

  @Column({ type: 'boolean', default: false })
  needsUrgentService: boolean;

  @Column({ type: 'uuid' })
  recordedByUserId: string;
}
