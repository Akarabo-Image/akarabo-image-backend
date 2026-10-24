import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { InvalidAmountError } from '../application/invalid-amount.error';
import { sendErrorEnvelope } from './error-envelope';

/** Maps invalid money amounts to HTTP 400. */
@Catch(InvalidAmountError)
export class InvalidAmountExceptionFilter implements ExceptionFilter {
  catch(exception: InvalidAmountError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    sendErrorEnvelope(response, request, 400, exception.message, 'Bad Request');
  }
}
