import { Role } from '../../util/roles';

/**
 * User domain model. The application layer never talks to the database —
 * persistence adapters (src/persistence) map their entities to this model.
 * The password hash is only ever read by the authentication flow and is
 * never exposed through API responses (see toPublicUser).
 */
export class User {
  id: string;

  fullName: string;

  email: string;

  phone?: string;

  /** Only used to verify credentials — never serialized to clients. */
  passwordHash: string;

  role: Role;

  /**
   * Users are never deleted (they are referenced by audit logs and financial
   * records) — access is revoked by deactivating the account.
   */
  isActive: boolean;

  lastLoginAt?: Date;

  createdAt: Date;

  updatedAt: Date;
}

/** Shape of a user as returned by the API (no secrets). */
export type PublicUser = Omit<User, 'passwordHash'>;

/** Strips the password hash before a user leaves the application layer. */
export function toPublicUser(user: User): PublicUser {
  const { passwordHash, ...safe } = user;
  void passwordHash;
  return safe;
}
