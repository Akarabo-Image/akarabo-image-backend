import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AUDIT_REPOSITORY } from '../application/audit/audit.repository.interface';
import { BOOKING_REPOSITORY } from '../application/booking/booking.repository.interface';
import { CUSTOMER_REPOSITORY } from '../application/customer/customer.repository.interface';
import { EXPENSE_REPOSITORY } from '../application/expense/expense.repository.interface';
import { PAYMENT_REPOSITORY } from '../application/payment/payment.repository.interface';
import { USER_REPOSITORY } from '../application/user/user.repository.interface';
import { AuditLogEntity } from '../persistence/audit/audit-log.entity';
import { AuditLogRepository } from '../persistence/audit/audit-log.repository';
import { BookingEntity } from '../persistence/booking/booking.entity';
import { BookingRepository } from '../persistence/booking/booking.repository';
import { CustomerEntity } from '../persistence/customer/customer.entity';
import { CustomerRepository } from '../persistence/customer/customer.repository';
import { ExpenseEntity } from '../persistence/expense/expense.entity';
import { ExpenseRepository } from '../persistence/expense/expense.repository';
import { PaymentEntity } from '../persistence/payment/payment.entity';
import { PaymentRepository } from '../persistence/payment/payment.repository';
import { UserEntity } from '../persistence/user/user.entity';
import { InquiryEntity } from '../persistence/inquiry/inquiry.entity';
import { UserRepository } from '../persistence/user/user.repository';
import { PushTokenEntity } from '../persistence/notification/push-token.entity';

/**
 * Global persistence module: binds each application repository port
 * (USER_REPOSITORY, PAYMENT_REPOSITORY, ...) to its TypeORM adapter.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      AuditLogEntity,
      PaymentEntity,
      ExpenseEntity,
      CustomerEntity,
      BookingEntity,
      InquiryEntity,
      PushTokenEntity,
    ]),
  ],
  providers: [
    { provide: USER_REPOSITORY, useClass: UserRepository },
    { provide: AUDIT_REPOSITORY, useClass: AuditLogRepository },
    { provide: PAYMENT_REPOSITORY, useClass: PaymentRepository },
    { provide: EXPENSE_REPOSITORY, useClass: ExpenseRepository },
    { provide: CUSTOMER_REPOSITORY, useClass: CustomerRepository },
    { provide: BOOKING_REPOSITORY, useClass: BookingRepository },
  ],
  exports: [
    USER_REPOSITORY,
    AUDIT_REPOSITORY,
    PAYMENT_REPOSITORY,
    EXPENSE_REPOSITORY,
    CUSTOMER_REPOSITORY,
    BOOKING_REPOSITORY,
  ],
})
export class RepositoryModule {}
