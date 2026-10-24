import type { Customer } from './customer';

/**
 * Fluent builder for Customer instances — mainly used by tests to construct
 * customers with only the fields that matter for the scenario.
 */
export class CustomerBuilder {
  private readonly customer: Customer = {
    id: '77777777-4444-4444-4444-444444444444',
    name: 'Aline Uwase',
    phone: '+250788111222',
    email: 'aline@example.rw',
    address: 'KG 11 Ave, Kigali',
    notes: 'Prefers WhatsApp over calls',
    isActive: true,
    createdByUserId: '33333333-3333-3333-3333-333333333333',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  withId(id: string): this {
    this.customer.id = id;
    return this;
  }

  withName(name: string): this {
    this.customer.name = name;
    return this;
  }

  withPhone(phone: string): this {
    this.customer.phone = phone;
    return this;
  }

  withEmail(email: string): this {
    this.customer.email = email;
    return this;
  }

  withAddress(address: string): this {
    this.customer.address = address;
    return this;
  }

  withNotes(notes: string): this {
    this.customer.notes = notes;
    return this;
  }

  /** Marks the customer deactivated. */
  deactivated(): this {
    this.customer.isActive = false;
    return this;
  }

  /** Apply arbitrary overrides in one call. */
  with(overrides: Partial<Customer>): this {
    Object.assign(this.customer, overrides);
    return this;
  }

  build(): Customer {
    return { ...this.customer };
  }
}

export function customerBuilder(): CustomerBuilder {
  return new CustomerBuilder();
}
