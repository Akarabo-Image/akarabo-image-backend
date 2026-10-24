import {
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * All entities extend this base. Column types are intentionally not pinned so
 * TypeORM can normalize them per driver (PostgreSQL vs embedded sqljs dev
 * fallback) — keep it driver-agnostic.
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
