import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../base.entity';

export enum PhotographerTaskStatus {
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

@Entity('photographer_tasks')
@Index('IDX_photographer_tasks_assignee_day', ['photographerUserId', 'taskDate'])
export class PhotographerTaskEntity extends BaseEntity {
  @Column({ type: 'uuid' })
  studioServiceId: string;

  @Column({ type: 'uuid' })
  photographerUserId: string;

  @Column({ type: 'varchar', length: 10 })
  taskDate: string;

  @Column({ type: 'int' })
  photosToEdit: number;

  @Column({ type: 'int', nullable: true })
  editedPhotos?: number;

  @Column({ type: 'varchar', length: 20, default: PhotographerTaskStatus.ASSIGNED })
  status: PhotographerTaskStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes?: string;

  @Column({ type: 'uuid' })
  assignedByUserId: string;

  @Column({ nullable: true })
  readAt?: Date;

  @Column({ nullable: true })
  completedAt?: Date;
}
