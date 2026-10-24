import type { Role } from '../util/roles';

/**
 * The authenticated identity attached to a request by the JWT strategy.
 * Services receive it as the "actor" of an operation so they can enforce
 * authorization rules and record audit trails.
 */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}
