import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthenticationError } from '../application/authentication/authentication.error';
import { sendErrorEnvelope } from './error-envelope';

/** Maps AuthenticationError (bad/missing credentials) to HTTP 401. */
@Catch(AuthenticationError)
export class AuthenticationErrorFilter implements ExceptionFilter {
  catch(exception: AuthenticationError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    sendErrorEnvelope(
      response,
      request,
      401,
      exception.message,
      'Unauthorized',
    );
  }
}
