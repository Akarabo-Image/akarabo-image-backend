import type { User } from './user';
import type { UserPage, UserRepository } from './user.repository.interface';

/**
 * In-memory fake of the user repository for unit tests.
 * Defaults behave like an empty database; override per test as needed.
 */
export function userRepositoryMock(
  overrides: Partial<UserRepository> = {},
): jest.Mocked<UserRepository> {
  const emptyPage: UserPage = {
    data: [],
    meta: { page: 1, limit: 20, total: 0 },
  };

  // Built without a contextual type so the jest.fn generic chain infers
  // correctly, then cast once to the mocked shape.
  const mock = {
    findAll: jest
      .fn<Promise<UserPage>, Parameters<UserRepository['findAll']>>()
      .mockResolvedValue(emptyPage),
    findById: jest
      .fn<Promise<User | null>, Parameters<UserRepository['findById']>>()
      .mockResolvedValue(null),
    findByEmail: jest
      .fn<Promise<User | null>, Parameters<UserRepository['findByEmail']>>()
      .mockResolvedValue(null),
    findByPhone: jest
      .fn<Promise<User | null>, Parameters<UserRepository['findByPhone']>>()
      .mockResolvedValue(null),
    create: jest
      .fn<Promise<User>, Parameters<UserRepository['create']>>()
      .mockImplementation((data) =>
        Promise.resolve({
          id: '33333333-3333-3333-3333-333333333333',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          ...data,
        }),
      ),
    update: jest
      .fn<Promise<User>, Parameters<UserRepository['update']>>()
      .mockImplementation((user) => Promise.resolve(user)),
    updateLastLogin: jest
      .fn<Promise<void>, Parameters<UserRepository['updateLastLogin']>>()
      .mockResolvedValue(undefined),
  };

  return Object.assign(
    mock as unknown as jest.Mocked<UserRepository>,
    overrides,
  );
}
