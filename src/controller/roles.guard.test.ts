import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessDeniedError } from '../application/access-denied.error';
import { Role } from '../util/roles';
import { IS_PUBLIC_KEY } from './public.decorator';
import { ROLES_KEY } from './roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const createContext = (user?: {
    id: string;
    email: string;
    role: Role;
  }): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new RolesGuard(reflector);
  });

  const mockMetadata = (
    isPublic: boolean | undefined,
    roles: Role[] | undefined,
  ) => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return isPublic;
      if (key === ROLES_KEY) return roles;
      return undefined;
    });
  };

  it('allows public routes without checking the user', () => {
    mockMetadata(true, undefined);
    expect(guard.canActivate(createContext(undefined))).toBe(true);
  });

  it('allows any authenticated user when no roles are required', () => {
    mockMetadata(false, undefined);
    const context = createContext({
      id: 'u1',
      email: 'a@b.rw',
      role: Role.CASHIER,
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows a user whose role is in the required list', () => {
    mockMetadata(false, [Role.OWNER, Role.MANAGER]);
    const context = createContext({
      id: 'u1',
      email: 'a@b.rw',
      role: Role.MANAGER,
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects a user whose role is not required', () => {
    mockMetadata(false, [Role.OWNER]);
    const context = createContext({
      id: 'u1',
      email: 'a@b.rw',
      role: Role.PHOTOGRAPHER,
    });
    expect(() => guard.canActivate(context)).toThrow(AccessDeniedError);
  });

  it('rejects requests without an authenticated user', () => {
    mockMetadata(false, [Role.OWNER]);
    expect(() => guard.canActivate(createContext(undefined))).toThrow(
      AccessDeniedError,
    );
  });
});
