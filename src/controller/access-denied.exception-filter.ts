import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AccessDeniedError } from '../application/access-denied.error';
import { sendErrorEnvelope } from './error-envelope';

/** Maps AccessDeniedError (and all subclasses) to HTTP 403. */
@Catch(AccessDeniedError)
export class AccessDeniedExceptionFilter implements ExceptionFilter {
  catch(exception: AccessDeniedError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    sendErrorEnvelope(response, request, 403, exception.message, 'Forbidden');
  }
}
