import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { AuditLogEntity } from './audit/audit-log.entity';
import { BookingEntity } from './booking/booking.entity';
import { buildDatabaseConnectionConfig } from './database-connection.config';
import { CustomerEntity } from './customer/customer.entity';
import { ExpenseEntity } from './expense/expense.entity';
import { PaymentEntity } from './payment/payment.entity';
import { UserEntity } from './user/user.entity';
import { StudioServiceEntity } from './studio-service/studio-service.entity';
import { PhotographerWorkEntity } from './photographer-work/photographer-work.entity';
import { PhotographerTaskEntity } from './photographer-task/photographer-task.entity';
import { InquiryEntity } from './inquiry/inquiry.entity';
import { PushTokenEntity } from './notification/push-token.entity';

// The DataSource below is built at module import time — before any caller's
// main() can call loadEnv() — so .env is applied here, at the top.
loadEnv();

/**
 * Standalone data source used by the migration/seed scripts:
 *
 *   npm run migrate          # apply pending migrations
 *   npm run migrate:revert   # revert the last applied migration
 *   npm run seed             # create the initial owner account
 *
 * (The running server builds its own connection in src/module/database.module.ts.)
 */
function buildDataSource(): DataSource {
  const config = buildDatabaseConnectionConfig((key) => process.env[key]);
  const base = {
    entities: [
      UserEntity,
      AuditLogEntity,
      PaymentEntity,
      ExpenseEntity,
      CustomerEntity,
      BookingEntity,
      StudioServiceEntity,
      PhotographerWorkEntity,
      PhotographerTaskEntity,
      InquiryEntity,
      PushTokenEntity,
    ],
    migrations: ['migrations/*.ts'],
    migrationsTableName: 'migrations',
  };

  if (config.isPostgres) {
    return new DataSource({
      ...base,
      type: 'postgres',
      host: config.postgres.host,
      port: config.postgres.port,
      username: config.postgres.username,
      password: config.postgres.password,
      database: config.postgres.database,
      ssl: config.postgres.ssl ? { rejectUnauthorized: false } : false,
    });
  }

  return new DataSource({
    ...base,
    type: 'sqljs',
    autoSave: config.sqljs.autoSave,
    location: config.sqljs.autoSave ? config.sqljs.location : undefined,
  });
}

export default buildDataSource();
