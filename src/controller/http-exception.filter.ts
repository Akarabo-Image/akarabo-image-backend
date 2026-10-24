import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { sendErrorEnvelope } from './error-envelope';

/** Plain number so comparisons never mix a numeric status with the enum. */
const INTERNAL_SERVER_ERROR: number = HttpStatus.INTERNAL_SERVER_ERROR;

/**
 * Catches every Nest HttpException (input validation, guards, parsing) and
 * normalizes it into the single JSON error envelope used by the API.
 * Domain errors are handled by the more specific filters registered next to
 * it in src/setup-app.ts.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();
    let message: string | string[] = exception.message;
    let error = exception.name;

    const payload = exception.getResponse();
    if (typeof payload === 'object' && payload !== null) {
      const body = payload as Record<string, unknown>;
      message = (body.message as string | string[]) ?? exception.message;
      error = (body.error as string) ?? exception.name;
    }

    if (status === INTERNAL_SERVER_ERROR) {
      this.logger.error(exception.message, exception.stack);
    }

    sendErrorEnvelope(response, request, status, message, error);
  }
}
