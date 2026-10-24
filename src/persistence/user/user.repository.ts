import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import type { User } from '../../application/user/user';
import type {
  NewUser,
  UserPage,
  UserRepository as UserRepositoryPort,
  UserSearchQuery,
} from '../../application/user/user.repository.interface';
import { UserEntity } from './user.entity';

/** Entity → domain mapping. */
function toDomain(entity: UserEntity): User {
  return {
    id: entity.id,
    fullName: entity.fullName,
    email: entity.email,
    phone: entity.phone,
    passwordHash: entity.passwordHash,
    role: entity.role,
    isActive: entity.isActive,
    lastLoginAt: entity.lastLoginAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

/**
 * TypeORM adapter for the user repository port. All queries (including the
 * pagination/search behaviour) live here, away from the business logic.
 */
@Injectable()
export class UserRepository implements UserRepositoryPort {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  async findAll(query: UserSearchQuery): Promise<UserPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.users
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: query.isActive });
    }
    if (query.search) {
      this.applySearch(qb, query.search);
    }

    const [rows, total] = await qb.getManyAndCount();
    return { data: rows.map(toDomain), meta: { page, limit, total } };
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.users.findOne({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
    return row ? toDomain(row) : null;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const row = await this.users.findOne({ where: { phone } });
    return row ? toDomain(row) : null;
  }

  async create(data: NewUser): Promise<User> {
    const row = await this.users.save(this.users.create(data));
    return toDomain(row);
  }

  async update(user: User): Promise<User> {
    await this.users.update(
      { id: user.id },
      {
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        // Undefined means "keep the stored value" (e.g. the hash was not
        // loaded because the password was not changed).
        passwordHash: user.passwordHash,
        role: user.role,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
      },
    );
    const fresh = await this.users.findOne({ where: { id: user.id } });
    if (!fresh) {
      // The row disappeared between update and re-read — treat as a race
      // condition and surface the in-memory state.
      return user;
    }
    return toDomain(fresh);
  }

  async updateLastLogin(id: string, at: Date): Promise<void> {
    await this.users.update({ id }, { lastLoginAt: at });
  }

  /** Case-insensitive search that also works on the embedded dev driver. */
  private applySearch(
    qb: SelectQueryBuilder<UserEntity>,
    search: string,
  ): void {
    const pattern = `%${search}%`;
    const isPostgres = qb.connection.options.type === 'postgres';
    const op = isPostgres ? 'ILIKE' : 'LIKE';
    qb.andWhere(
      `(user.fullName ${op} :q OR user.email ${op} :q OR user.phone ${op} :q)`,
      { q: pattern },
    );
  }
}
