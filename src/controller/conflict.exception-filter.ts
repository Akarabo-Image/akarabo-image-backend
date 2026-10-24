import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { BookingAlreadyExistsError } from '../application/booking/booking-already-exists.error';
import { BookingInvalidStatusError } from '../application/booking/booking-invalid-status.error';
import { DuplicateCustomerPhoneError } from '../application/customer/duplicate-customer-phone.error';
import { ExpenseAlreadyReversedError } from '../application/expense/expense-already-reversed.error';
import { DuplicatePaymentReferenceError } from '../application/payment/duplicate-payment-reference.error';
import { PaymentAlreadyReversedError } from '../application/payment/payment-already-reversed.error';
import { sendErrorEnvelope } from './error-envelope';

type DomainConflict =
  | DuplicatePaymentReferenceError
  | PaymentAlreadyReversedError
  | ExpenseAlreadyReversedError
  | DuplicateCustomerPhoneError
  | BookingAlreadyExistsError
  | BookingInvalidStatusError;

/** Maps conflicts (duplicate receipt/phone, double reversal, double-booking,
 * illegal lifecycle moves) to HTTP 409. */
@Catch(
  DuplicatePaymentReferenceError,
  PaymentAlreadyReversedError,
  ExpenseAlreadyReversedError,
  DuplicateCustomerPhoneError,
  BookingAlreadyExistsError,
  BookingInvalidStatusError,
)
export class ConflictExceptionFilter implements ExceptionFilter {
  catch(exception: DomainConflict, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    sendErrorEnvelope(response, request, 409, exception.message, 'Conflict');
  }
}
