import { AccessDeniedError } from '../access-denied.error';

/** Thrown when a user lacks the privilege for a user-management rule
 * (e.g. a manager trying to create or promote an owner). */
export class UserAccessDeniedError extends AccessDeniedError {
  constructor(message: string) {
    super(message);
    this.name = 'UserAccessDeniedError';
  }
}
