import type { AuthUser } from '../../application/auth-user';
import type { Role } from '../../util/roles';
import type { PublicUser } from '../../application/user/user';

/** Input for creating a user (mirrors the request DTO, without transport). */
export interface CreateUserData {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role: Role;
  isActive?: boolean;
}

/** Input for updating a user — all fields optional. */
export interface UpdateUserData {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  role?: Role;
  isActive?: boolean;
}

/** Filters for listing users. */
export interface UserListQuery {
  page?: number;
  limit?: number;
  role?: Role;
  isActive?: boolean;
  search?: string;
}

export interface PaginatedUsers {
  data: PublicUser[];
  meta: { page: number; limit: number; total: number };
}

/**
 * DI token for the user service — interfaces have no runtime value, so
 * controllers inject this token and the module binds it to the impl.
 */
export const USER_SERVICE = Symbol('USER_SERVICE');

/** User management use cases, consumed by the controller layer. */
export interface UserService {
  create(data: CreateUserData, actor: AuthUser): Promise<PublicUser>;
  findAll(query: UserListQuery): Promise<PaginatedUsers>;
  findOne(id: string): Promise<PublicUser>;
  update(
    id: string,
    data: UpdateUserData,
    actor: AuthUser,
  ): Promise<PublicUser>;
  deactivate(id: string, actor: AuthUser): Promise<PublicUser>;
  activate(id: string, actor: AuthUser): Promise<PublicUser>;
}
