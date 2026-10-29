import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AuditLogEntity } from './audit/audit-log.entity';
import { BookingEntity } from './booking/booking.entity';
import { CustomerEntity } from './customer/customer.entity';
import { ExpenseEntity } from './expense/expense.entity';
import { PaymentEntity } from './payment/payment.entity';
import { UserEntity } from './user/user.entity';
import { StudioServiceEntity } from './studio-service/studio-service.entity';

/**
 * In-memory sqljs database with the schema synchronized from the entities —
 * used by repository tests, which exercise real SQL without needing a
 * PostgreSQL server.
 */
export function createInMemoryDatabase(): Promise<DataSource> {
  return new DataSource({
    type: 'sqljs',
    autoSave: false,
    synchronize: true,
    entities: [
      UserEntity,
      AuditLogEntity,
      PaymentEntity,
      ExpenseEntity,
      CustomerEntity,
      BookingEntity,
      StudioServiceEntity,
    ],
  }).initialize();
}
