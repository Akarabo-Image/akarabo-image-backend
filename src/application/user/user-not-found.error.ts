import { NotFoundError } from '../not-found.error';

/** Thrown when a user id does not match any record. */
export class UserNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`User with id "${id}" was not found`);
    this.name = 'UserNotFoundError';
  }
}
