import { Role } from '../../util/roles';
import type { User } from './user';

/**
 * Fluent builder for User instances — mainly used by tests to construct
 * users with only the fields that matter for the scenario.
 *
 *   const user = userBuilder().withRole(Role.OWNER).build();
 */
export class UserBuilder {
  private readonly user: User = {
    id: '11111111-1111-1111-1111-111111111111',
    fullName: 'Test User',
    email: 'user@akarabo.rw',
    passwordHash: 'hashed-password',
    role: Role.PHOTOGRAPHER,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  withId(id: string): this {
    this.user.id = id;
    return this;
  }

  withFullName(fullName: string): this {
    this.user.fullName = fullName;
    return this;
  }

  withEmail(email: string): this {
    this.user.email = email;
    return this;
  }

  withPhone(phone: string): this {
    this.user.phone = phone;
    return this;
  }

  withPasswordHash(passwordHash: string): this {
    this.user.passwordHash = passwordHash;
    return this;
  }

  withRole(role: Role): this {
    this.user.role = role;
    return this;
  }

  active(isActive = true): this {
    this.user.isActive = isActive;
    return this;
  }

  withLastLoginAt(lastLoginAt: Date): this {
    this.user.lastLoginAt = lastLoginAt;
    return this;
  }

  /** Apply arbitrary overrides in one call. */
  with(overrides: Partial<User>): this {
    Object.assign(this.user, overrides);
    return this;
  }

  build(): User {
    return { ...this.user };
  }
}

export function userBuilder(): UserBuilder {
  return new UserBuilder();
}
