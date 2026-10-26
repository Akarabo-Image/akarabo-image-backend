/**
 * A studio client (person or company) the studio books work for.
 *
 * Customers are deactivated, never deleted — bookings and payments keep
 * referencing them for the whole history of the studio.
 */
export interface Customer {
  id: string;
  name: string;
  /** Primary contact number; shared contact numbers are allowed. */
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  /** Inactive customers cannot be booked (but historical rows keep them). */
  isActive: boolean;
  /** Staff member who registered the customer. */
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}
