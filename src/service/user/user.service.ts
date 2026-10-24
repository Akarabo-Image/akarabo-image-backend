import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { AuthUser } from '../../application/auth-user';
import { Role } from '../../util/roles';
import { AuditServiceImpl } from '../audit/audit.service';
import { DuplicateEmailError } from '../../application/user/duplicate-email.error';
import { DuplicatePhoneError } from '../../application/user/duplicate-phone.error';
import type {
  NewUser,
  UserRepository,
} from '../../application/user/user.repository.interface';
import { USER_REPOSITORY } from '../../application/user/user.repository.interface';
import type {
  CreateUserData,
  PaginatedUsers,
  UpdateUserData,
  UserListQuery,
  UserService,
} from './user.service.interface';
import type { PublicUser } from '../../application/user/user';
import { toPublicUser } from '../../application/user/user';
import { UserAccessDeniedError } from '../../application/user/user-access-denied.error';
import { UserNotFoundError } from '../../application/user/user-not-found.error';
import { UserSelfDeletionError } from '../../application/user/user-self-deletion.error';

const BCRYPT_ROUNDS = 10;

/**
 * User management use cases. Business rules live here; all data access goes
 * through the UserRepository port, so this class is fully unit-testable with
 * a mocked repository.
 */
@Injectable()
export class UserServiceImpl implements UserService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly audit: AuditServiceImpl,
  ) {}

  async create(data: CreateUserData, actor: AuthUser) {
    if (data.role === Role.OWNER && actor.role !== Role.OWNER) {
      throw new UserAccessDeniedError(
        'Only the owner can create owner accounts',
      );
    }
    if (await this.users.findByEmail(data.email)) {
      throw new DuplicateEmailError(data.email);
    }
    if (data.phone && (await this.users.findByPhone(data.phone))) {
      throw new DuplicatePhoneError(data.phone);
    }

    const newUser: NewUser = {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      passwordHash: await bcrypt.hash(data.password, BCRYPT_ROUNDS),
      role: data.role,
      isActive: data.isActive ?? true,
    };
    const user = await this.users.create(newUser);

    await this.audit.log({
      userId: actor.id,
      action: 'USER_CREATED',
      entity: 'User',
      entityId: user.id,
      changes: { after: toPublicUser(user) },
    });

    return toPublicUser(user);
  }

  async findAll(query: UserListQuery): Promise<PaginatedUsers> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const result = await this.users.findAll({
      page,
      limit,
      role: query.role,
      isActive: query.isActive,
      search: query.search,
    });

    return {
      data: result.data.map(toPublicUser),
      meta: result.meta,
    };
  }

  async findOne(id: string) {
    const user = await this.users.findById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }
    return toPublicUser(user);
  }

  async update(id: string, data: UpdateUserData, actor: AuthUser) {
    const user = await this.users.findById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }

    if (data.role === Role.OWNER && actor.role !== Role.OWNER) {
      throw new UserAccessDeniedError(
        'Only the owner can assign the owner role',
      );
    }
    if (data.email && data.email !== user.email) {
      if (await this.users.findByEmail(data.email)) {
        throw new DuplicateEmailError(data.email);
      }
    }
    if (data.phone && data.phone !== user.phone) {
      if (await this.users.findByPhone(data.phone)) {
        throw new DuplicatePhoneError(data.phone);
      }
    }

    const before = toPublicUser(user);

    user.fullName = data.fullName ?? user.fullName;
    user.email = data.email ?? user.email;
    user.phone = data.phone !== undefined ? data.phone : user.phone;
    user.role = data.role ?? user.role;
    user.isActive = data.isActive ?? user.isActive;
    if (data.password) {
      user.passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    }

    const saved = await this.users.update(user);

    await this.audit.log({
      userId: actor.id,
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: id,
      changes: { before, after: toPublicUser(saved) },
    });

    return toPublicUser(saved);
  }

  /**
   * Deactivation instead of deletion: user records stay referenced by audit
   * logs and financial history, and deactivated users can no longer log in.
   */
  async deactivate(id: string, actor: AuthUser) {
    if (actor.id === id) {
      throw new UserSelfDeletionError();
    }
    return this.setActive(id, false, actor);
  }

  async activate(id: string, actor: AuthUser) {
    return this.setActive(id, true, actor);
  }

  private async setActive(
    id: string,
    isActive: boolean,
    actor: AuthUser,
  ): Promise<PublicUser> {
    const user = await this.users.findById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }

    const before = toPublicUser(user);
    user.isActive = isActive;
    const saved = await this.users.update(user);

    await this.audit.log({
      userId: actor.id,
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entity: 'User',
      entityId: id,
      changes: { before, after: toPublicUser(saved) },
    });

    return toPublicUser(saved);
  }
}
