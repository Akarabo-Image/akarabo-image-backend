import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { DuplicateEmailError } from '../application/user/duplicate-email.error';
import { DuplicatePhoneError } from '../application/user/duplicate-phone.error';
import { sendErrorEnvelope } from './error-envelope';

/** Maps uniqueness conflicts (duplicate email/phone) to HTTP 409. */
@Catch(DuplicateEmailError, DuplicatePhoneError)
export class DuplicateUserExceptionFilter implements ExceptionFilter {
  catch(
    exception: DuplicateEmailError | DuplicatePhoneError,
    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    sendErrorEnvelope(response, request, 409, exception.message, 'Conflict');
  }
}
