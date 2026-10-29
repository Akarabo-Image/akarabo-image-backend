import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import {
  AUTHENTICATION_CONFIG,
  authenticationConfigFactory,
  jwtModuleOptionsFactory,
} from '../application/authentication/authentication.config';
import { AuthenticationServiceImpl } from '../service/authentication/authentication.service';
import { AUTHENTICATION_SERVICE } from '../service/authentication/authentication.service.interface';
import { JwtStrategy } from '../application/authentication/jwt.strategy';
import { AuditServiceImpl } from '../service/audit/audit.service';
import { BookingServiceImpl } from '../service/booking/booking.service';
import { BOOKING_SERVICE } from '../service/booking/booking.service.interface';
import { CustomerServiceImpl } from '../service/customer/customer.service';
import { CUSTOMER_SERVICE } from '../service/customer/customer.service.interface';
import { ExpenseServiceImpl } from '../service/expense/expense.service';
import { EXPENSE_SERVICE } from '../service/expense/expense.service.interface';
import { PaymentServiceImpl } from '../service/payment/payment.service';
import { PAYMENT_SERVICE } from '../service/payment/payment.service.interface';
import { UserServiceImpl } from '../service/user/user.service';
import { USER_SERVICE } from '../service/user/user.service.interface';
import { RepositoryModule } from './repository.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InquiryEntity } from '../persistence/inquiry/inquiry.entity';
import { InquiryService } from '../service/inquiry/inquiry.service';
import { StudioServiceEntity } from '../persistence/studio-service/studio-service.entity';
import { PhotographerWorkEntity } from '../persistence/photographer-work/photographer-work.entity';
import { CustomerEntity } from '../persistence/customer/customer.entity';
import { PaymentEntity } from '../persistence/payment/payment.entity';
import { UserEntity } from '../persistence/user/user.entity';
import { StudioReportService, STUDIO_REPORT_SERVICE } from '../service/report/studio-report.service';
import { PhotographerTaskEntity } from '../persistence/photographer-task/photographer-task.entity';
import { PushTokenEntity } from '../persistence/notification/push-token.entity';
import { PushNotificationService } from '../service/notification/push-notification.service';

/** Provides every application service (business logic layer). */
@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: jwtModuleOptionsFactory,
    }),
    RepositoryModule,
    TypeOrmModule.forFeature([InquiryEntity, StudioServiceEntity, PhotographerWorkEntity, PhotographerTaskEntity, CustomerEntity, PaymentEntity, UserEntity, PushTokenEntity]),
  ],
  providers: [
    UserServiceImpl,
    AuthenticationServiceImpl,
    AuditServiceImpl,
    PaymentServiceImpl,
    ExpenseServiceImpl,
    CustomerServiceImpl,
    BookingServiceImpl,
    InquiryService,
    PushNotificationService,
    StudioReportService,
    JwtStrategy,
    {
      provide: AUTHENTICATION_CONFIG,
      inject: [ConfigService],
      useFactory: authenticationConfigFactory,
    },
    // Interface tokens alias the implementations so controllers can depend
    // on the application-layer interfaces (no runtime class to infer).
    { provide: USER_SERVICE, useExisting: UserServiceImpl },
    { provide: AUTHENTICATION_SERVICE, useExisting: AuthenticationServiceImpl },
    { provide: PAYMENT_SERVICE, useExisting: PaymentServiceImpl },
    { provide: EXPENSE_SERVICE, useExisting: ExpenseServiceImpl },
    { provide: CUSTOMER_SERVICE, useExisting: CustomerServiceImpl },
    { provide: BOOKING_SERVICE, useExisting: BookingServiceImpl },
    { provide: STUDIO_REPORT_SERVICE, useExisting: StudioReportService },
  ],
  exports: [
    USER_SERVICE,
    AUTHENTICATION_SERVICE,
    PAYMENT_SERVICE,
    EXPENSE_SERVICE,
    CUSTOMER_SERVICE,
    BOOKING_SERVICE,
    STUDIO_REPORT_SERVICE,
    UserServiceImpl,
    AuthenticationServiceImpl,
    AuditServiceImpl,
    PaymentServiceImpl,
    ExpenseServiceImpl,
    CustomerServiceImpl,
    BookingServiceImpl,
    InquiryService,
    PushNotificationService,
  ],
})
export class ServiceModule {}
