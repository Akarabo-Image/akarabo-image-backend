import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { InvalidInputError } from '../application/invalid-input.error';
import { sendErrorEnvelope } from './error-envelope';

/** Maps bad-input domain errors (real-date rules, required reasons) to HTTP 400. */
@Catch(InvalidInputError)
export class InvalidInputExceptionFilter implements ExceptionFilter {
  catch(exception: InvalidInputError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    sendErrorEnvelope(response, request, 400, exception.message, 'Bad Request');
  }
}
