import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { NotFoundError } from '../application/not-found.error';
import { sendErrorEnvelope } from './error-envelope';

/** Maps NotFoundError (and all subclasses) to HTTP 404. */
@Catch(NotFoundError)
export class NotFoundExceptionFilter implements ExceptionFilter {
  catch(exception: NotFoundError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    sendErrorEnvelope(response, request, 404, exception.message, 'Not Found');
  }
}
