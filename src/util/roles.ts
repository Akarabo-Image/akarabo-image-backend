/**
 * Application-wide user roles, ordered loosely by privilege.
 * OWNER = studio owner/admin.
 */
export enum Role {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  PHOTOGRAPHER = 'PHOTOGRAPHER',
  CASHIER = 'CASHIER',
}
