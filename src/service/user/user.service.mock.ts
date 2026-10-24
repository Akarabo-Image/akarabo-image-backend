import type { PublicUser } from '../../application/user/user';
import type { PaginatedUsers, UserService } from './user.service.interface';

/** Stub of the user service for controller-level tests. */
export function userServiceMock(
  overrides: Partial<UserService> = {},
): jest.Mocked<UserService> {
  const emptyUser = {} as PublicUser;
  const emptyPage: PaginatedUsers = {
    data: [],
    meta: { page: 1, limit: 20, total: 0 },
  };

  // Built without a contextual type so the jest.fn generic chain infers
  // correctly, then cast once to the mocked shape.
  const mock = {
    create: jest
      .fn<Promise<PublicUser>, Parameters<UserService['create']>>()
      .mockResolvedValue(emptyUser),
    findAll: jest
      .fn<Promise<PaginatedUsers>, Parameters<UserService['findAll']>>()
      .mockResolvedValue(emptyPage),
    findOne: jest
      .fn<Promise<PublicUser>, Parameters<UserService['findOne']>>()
      .mockResolvedValue(emptyUser),
    update: jest
      .fn<Promise<PublicUser>, Parameters<UserService['update']>>()
      .mockResolvedValue(emptyUser),
    deactivate: jest
      .fn<Promise<PublicUser>, Parameters<UserService['deactivate']>>()
      .mockResolvedValue(emptyUser),
    activate: jest
      .fn<Promise<PublicUser>, Parameters<UserService['activate']>>()
      .mockResolvedValue(emptyUser),
  };

  return Object.assign(mock as unknown as jest.Mocked<UserService>, overrides);
}
