import { Column, Entity, Index } from 'typeorm';
import { Role } from '../../util/roles';
import { BaseEntity } from '../base.entity';

@Entity('users')
@Index('UQ_users_email', ['email'], { unique: true })
@Index('UQ_users_phone', ['phone'], { unique: true })
export class UserEntity extends BaseEntity {
  @Column({ length: 120 })
  fullName: string;

  @Column({ length: 255 })
  email: string;

  /** Optional — declared with `?` (not `| null`) so TypeORM can infer the
   * column type from the emitted design type. */
  @Column({ length: 30, nullable: true })
  phone?: string;

  /** Never returned by API responses — selected explicitly only when logging in. */
  @Column({ select: false })
  passwordHash: string;

  /** Explicit type needed: enum-typed columns emit `Object` design metadata. */
  @Column({ type: 'varchar', length: 20 })
  role: Role;

  /**
   * Users are never deleted (they are referenced by audit logs and financial
   * records) — access is revoked by deactivating the account.
   */
  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastLoginAt?: Date;
}
