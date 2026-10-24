import { SetMetadata } from '@nestjs/common';
import type { Role } from '../util/roles';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to the listed roles. Checked by the global RolesGuard
 * after AuthenticationGuard has attached the authenticated user.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
