import type { Role } from '../../util/roles';
import type { User } from './user';

export const USER_REPOSITORY = 'USER_REPOSITORY';

/** Filters accepted by UserRepository.findAll. */
export interface UserSearchQuery {
  page?: number;
  limit?: number;
  role?: Role;
  isActive?: boolean;
  search?: string;
}

export interface UserPage {
  data: User[];
  meta: { page: number; limit: number; total: number };
}

/** Data needed to insert a new user (everything is already decided). */
export interface NewUser {
  fullName: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
}

/**
 * Data-access contract for users. Implemented by the TypeORM adapter in
 * src/persistence/user and mocked in tests via user.repository.mock.ts.
 */
export interface UserRepository {
  findAll(query: UserSearchQuery): Promise<UserPage>;
  findById(id: string): Promise<User | null>;
  /** Includes the password hash — required by the authentication flow. */
  findByEmail(email: string): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
  create(data: NewUser): Promise<User>;
  /** Updates every mutable field of an existing user, by id. */
  update(user: User): Promise<User>;
  updateLastLogin(id: string, at: Date): Promise<void>;
}
