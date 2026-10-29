import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('push_device_tokens')
@Index('UQ_push_device_tokens_token', ['token'], { unique: true })
@Index('IDX_push_device_tokens_user_id', ['userId'])
export class PushTokenEntity extends BaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'text' })
  token: string;
}
