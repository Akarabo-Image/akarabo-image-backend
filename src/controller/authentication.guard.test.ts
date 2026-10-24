import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticationGuard } from './authentication.guard';
import { IS_PUBLIC_KEY } from './public.decorator';

describe('AuthenticationGuard', () => {
  let guard: AuthenticationGuard;
  let reflector: jest.Mocked<Reflector>;
  let passportCanActivate: jest.SpyInstance;

  type PassportParent = { canActivate: (...args: never[]) => unknown };

  const createContext = (): ExecutionContext =>
    ({
      getHandler: jest.fn(() => () => undefined),
      getClass: jest.fn(() => class {}),
      switchToHttp: () => ({ getRequest: () => ({}) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new AuthenticationGuard(reflector);

    // Spy on the passport AuthGuard('jwt') parent implementation that
    // actually talks to the JWT strategy.
    const passportParent = Object.getPrototypeOf(
      AuthenticationGuard.prototype,
    ) as PassportParent;
    passportCanActivate = jest
      .spyOn(passportParent, 'canActivate')
      .mockReturnValue(true);
  });

  afterEach(() => {
    passportCanActivate.mockRestore();
  });

  it('skips authentication for @Public() routes', () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    expect(guard.canActivate(createContext())).toBe(true);
    expect(passportCanActivate).not.toHaveBeenCalled();
  });

  it('delegates to passport for protected routes', () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    expect(guard.canActivate(createContext())).toBe(true);
    expect(passportCanActivate).toHaveBeenCalled();
  });

  it('propagates the passport result', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    passportCanActivate.mockReturnValue(false);

    expect(guard.canActivate(createContext())).toBe(false);
  });

  it('reads the public flag from handler and class metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    expect(guard.canActivate(createContext())).toBe(true);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      expect.any(Function),
      expect.any(Function),
    ]);
  });
});
