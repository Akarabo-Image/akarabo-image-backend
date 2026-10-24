import type { AuthUser } from '../../application/auth-user';
import type { PublicUser } from '../../application/user/user';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  expiresIn: string;
  user: PublicUser;
}

export interface LogoutResult {
  success: true;
  message: string;
}

/**
 * DI token for the authentication service — interfaces have no runtime
 * value, so controllers inject this token and the module binds it to the impl.
 */
export const AUTHENTICATION_SERVICE = Symbol('AUTHENTICATION_SERVICE');

/** Authentication use cases, consumed by the controller layer. */
export interface AuthenticationService {
  login(
    credentials: LoginCredentials,
    ipAddress?: string,
  ): Promise<LoginResult>;
  logout(user: AuthUser, ipAddress?: string): Promise<LogoutResult>;
  me(user: AuthUser): Promise<PublicUser>;
}
