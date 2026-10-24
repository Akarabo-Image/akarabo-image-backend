import { AccessDeniedError } from '../access-denied.error';

/** Thrown when users try to deactivate their own account. */
export class UserSelfDeletionError extends AccessDeniedError {
  constructor() {
    super('You cannot deactivate your own account');
    this.name = 'UserSelfDeletionError';
  }
}
