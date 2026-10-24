/**
 * Audit trail domain model. Rows are only ever inserted — important actions
 * (logins, financial changes, configuration updates) are recorded here with
 * the user who performed them. Never update or delete audit records.
 */
export interface AuditEntry {
  userId?: string;
  /** Verb-like action, e.g. LOGIN, USER_CREATED, PAYMENT_VOIDED. */
  action: string;
  /** Affected entity/table name, e.g. User, Booking, Payment. */
  entity: string;
  /** ID of the affected record, when applicable. */
  entityId?: string;
  /** Snapshot of what changed (before/after). */
  changes?: { before?: unknown; after?: unknown };
  ipAddress?: string;
}

export class AuditLog {
  id: string;

  /** User who performed the action (omitted for system-generated entries). */
  userId?: string;

  action: string;

  entity: string;

  entityId?: string;

  changes?: { before?: unknown; after?: unknown };

  ipAddress?: string;

  createdAt: Date;
}
