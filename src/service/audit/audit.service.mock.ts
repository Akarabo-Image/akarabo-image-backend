import type { AuditLog } from '../../application/audit/audit-log';
import type { AuditService } from './audit.service.interface';

/** Stub of the audit service for other services' unit tests. */
export function auditServiceMock(
  overrides: Partial<AuditService> = {},
): jest.Mocked<AuditService> {
  // Built without a contextual type so the jest.fn generic chain infers
  // correctly, then cast once to the mocked shape.
  const mock = {
    log: jest
      .fn<Promise<void>, Parameters<AuditService['log']>>()
      .mockResolvedValue(undefined),
    findByEntity: jest
      .fn<Promise<AuditLog[]>, Parameters<AuditService['findByEntity']>>()
      .mockResolvedValue([]),
    findByUser: jest
      .fn<Promise<AuditLog[]>, Parameters<AuditService['findByUser']>>()
      .mockResolvedValue([]),
  };

  return Object.assign(mock as unknown as jest.Mocked<AuditService>, overrides);
}
