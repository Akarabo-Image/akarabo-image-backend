import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuditEntry, AuditLog } from '../../application/audit/audit-log';
import type { AuditRepository } from '../../application/audit/audit.repository.interface';
import { AuditLogEntity } from './audit-log.entity';

/** Entity → domain mapping. */
function toDomain(entity: AuditLogEntity): AuditLog {
  return {
    id: entity.id,
    userId: entity.userId,
    action: entity.action,
    entity: entity.entity,
    entityId: entity.entityId,
    changes: entity.changes,
    ipAddress: entity.ipAddress,
    createdAt: entity.createdAt,
  };
}

/** TypeORM adapter for the audit repository port. */
@Injectable()
export class AuditLogRepository implements AuditRepository {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogs: Repository<AuditLogEntity>,
  ) {}

  async insert(entry: AuditEntry): Promise<AuditLog> {
    const row = await this.auditLogs.save(
      this.auditLogs.create({
        userId: entry.userId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        changes: entry.changes,
        ipAddress: entry.ipAddress,
      }),
    );
    return toDomain(row);
  }

  findByEntity(entity: string, entityId: string): Promise<AuditLog[]> {
    return this.auditLogs
      .find({ where: { entity, entityId }, order: { createdAt: 'DESC' } })
      .then((rows) => rows.map(toDomain));
  }

  findByUser(userId: string, limit = 50): Promise<AuditLog[]> {
    return this.auditLogs
      .find({ where: { userId }, order: { createdAt: 'DESC' }, take: limit })
      .then((rows) => rows.map(toDomain));
  }
}
