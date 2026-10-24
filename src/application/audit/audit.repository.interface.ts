import type { AuditEntry, AuditLog } from './audit-log';

export const AUDIT_REPOSITORY = 'AUDIT_REPOSITORY';

/**
 * Data-access contract for the audit trail. Implemented by the TypeORM
 * adapter in src/persistence/audit and mocked via audit.repository.mock.ts.
 */
export interface AuditRepository {
  insert(entry: AuditEntry): Promise<AuditLog>;
  /** Full history for one record, newest first. Used by reports/forensics. */
  findByEntity(entity: string, entityId: string): Promise<AuditLog[]>;
  /** Recent actions performed by one user. */
  findByUser(userId: string, limit?: number): Promise<AuditLog[]>;
}
