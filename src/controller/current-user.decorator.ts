import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../application/auth-user';

/**
 * Extracts the authenticated user attached by the JWT strategy.
 * Usage: `@CurrentUser() user: AuthUser`
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser | undefined => {
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    return request.user;
  },
);
