import { AccessDeniedError } from '../access-denied.error';

/**
 * Thrown when a booking (or any other flow) targets a deactivated customer
 * (HTTP 403). Reactivating the customer unblocks it.
 */
export class CustomerInactiveError extends AccessDeniedError {
  constructor(id: string) {
    super(`Customer ${id} is inactive — reactivate it before booking`);
    this.name = 'CustomerInactiveError';
  }
}
