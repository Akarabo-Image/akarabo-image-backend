import type { PublicUser } from '../../application/user/user';
import type {
  AuthenticationService,
  LoginResult,
  LogoutResult,
} from './authentication.service.interface';

/** Stub of the authentication service for controller-level tests. */
export function authenticationServiceMock(
  overrides: Partial<AuthenticationService> = {},
): jest.Mocked<AuthenticationService> {
  // Built without a contextual type so the jest.fn generic chain infers
  // correctly, then cast once to the mocked shape.
  const mock = {
    login: jest
      .fn<Promise<LoginResult>, Parameters<AuthenticationService['login']>>()
      .mockResolvedValue({
        accessToken: 'signed-token',
        expiresIn: '1d',
        user: {} as PublicUser,
      }),
    logout: jest
      .fn<Promise<LogoutResult>, Parameters<AuthenticationService['logout']>>()
      .mockResolvedValue({
        success: true,
        message: 'Logged out successfully. Discard your access token.',
      }),
    me: jest
      .fn<Promise<PublicUser>, Parameters<AuthenticationService['me']>>()
      .mockResolvedValue({} as PublicUser),
  };

  return Object.assign(
    mock as unknown as jest.Mocked<AuthenticationService>,
    overrides,
  );
}
