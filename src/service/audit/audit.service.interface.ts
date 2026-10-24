import type { AuditEntry, AuditLog } from '../../application/audit/audit-log';

/**
 * Central audit contract. Every module records "who did what" through this
 * service. Audit writes are best-effort: a failure to write an audit row is
 * logged but never breaks the business operation that triggered it.
 */
export interface AuditService {
  log(entry: AuditEntry): Promise<void>;
  findByEntity(entity: string, entityId: string): Promise<AuditLog[]>;
  findByUser(userId: string, limit?: number): Promise<AuditLog[]>;
}
