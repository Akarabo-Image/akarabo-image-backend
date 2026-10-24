import { Module } from '@nestjs/common';
import { AuthenticationController } from '../controller/authentication/authentication.controller';
import { BookingController } from '../controller/booking/booking.controller';
import { CustomerController } from '../controller/customer/customer.controller';
import { ExpenseController } from '../controller/expense/expense.controller';
import { PaymentController } from '../controller/payment/payment.controller';
import { UserController } from '../controller/user/user.controller';
import { InquiryController } from '../controller/inquiry/inquiry.controller';
import { ServiceModule } from './service.module';
import { StudioReportController } from '../controller/report/studio-report.controller';

/** Provides every controller (HTTP layer). */
@Module({
  imports: [ServiceModule],
  controllers: [
    AuthenticationController,
    UserController,
    PaymentController,
    ExpenseController,
    CustomerController,
    BookingController,
    InquiryController,
    StudioReportController,
  ],
})
export class ControllerModule {}
