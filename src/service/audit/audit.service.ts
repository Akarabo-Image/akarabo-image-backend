import { Inject, Injectable, Logger } from '@nestjs/common';
import type { AuditEntry, AuditLog } from '../../application/audit/audit-log';
import type { AuditRepository } from '../../application/audit/audit.repository.interface';
import { AUDIT_REPOSITORY } from '../../application/audit/audit.repository.interface';
import type { AuditService } from './audit.service.interface';

/**
 * Implementation of the central audit service. Audit writes are best-effort:
 * a failure to write an audit row is logged but never breaks the business
 * operation that triggered it.
 */
@Injectable()
export class AuditServiceImpl implements AuditService {
  private readonly logger = new Logger(AuditServiceImpl.name);

  constructor(
    @Inject(AUDIT_REPOSITORY) private readonly auditLogs: AuditRepository,
  ) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.auditLogs.insert(entry);
    } catch (error) {
      this.logger.error(
        `Failed to write audit log (${entry.action} on ${entry.entity})`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  findByEntity(entity: string, entityId: string): Promise<AuditLog[]> {
    return this.auditLogs.findByEntity(entity, entityId);
  }

  findByUser(userId: string, limit?: number): Promise<AuditLog[]> {
    return this.auditLogs.findByUser(userId, limit);
  }
}
