import { NotFoundError } from '../not-found.error';

/** Thrown when a customer id does not exist (HTTP 404). */
export class CustomerNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Customer ${id} not found`);
    this.name = 'CustomerNotFoundError';
  }
}
