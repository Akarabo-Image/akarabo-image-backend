import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('photographer_daily_work')
@Index('IDX_photographer_daily_work_day', ['workDate'])
export class PhotographerWorkEntity extends BaseEntity {
  @Column({ type: 'uuid' })
  photographerUserId: string;

  @Column({ type: 'varchar', length: 10 })
  workDate: string;

  @Column({ type: 'int' })
  editedPhotos: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes?: string;
}
