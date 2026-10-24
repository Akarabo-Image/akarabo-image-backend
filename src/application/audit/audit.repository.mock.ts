import type { AuditEntry, AuditLog } from './audit-log';
import type { AuditRepository } from './audit.repository.interface';

/** In-memory fake of the audit repository for unit tests. */
export function auditRepositoryMock(
  overrides: Partial<AuditRepository> = {},
): jest.Mocked<AuditRepository> {
  // Built without a contextual type so the jest.fn generic chain infers
  // correctly, then cast once to the mocked shape.
  const mock = {
    insert: jest
      .fn<Promise<AuditLog>, Parameters<AuditRepository['insert']>>()
      .mockImplementation((entry: AuditEntry) =>
        Promise.resolve({
          id: 'aaaaaaa1-0000-0000-0000-000000000000',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          ...entry,
        }),
      ),
    findByEntity: jest
      .fn<Promise<AuditLog[]>, Parameters<AuditRepository['findByEntity']>>()
      .mockResolvedValue([]),
    findByUser: jest
      .fn<Promise<AuditLog[]>, Parameters<AuditRepository['findByUser']>>()
      .mockResolvedValue([]),
  };

  return Object.assign(
    mock as unknown as jest.Mocked<AuditRepository>,
    overrides,
  );
}
