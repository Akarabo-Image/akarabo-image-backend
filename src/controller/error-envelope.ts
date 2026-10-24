import type { Response, Request } from 'express';

export interface ErrorEnvelope {
  success: false;
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

/** Builds the single error shape every API client receives. */
export function buildErrorEnvelope(
  request: Request,
  statusCode: number,
  message: string | string[],
  error: string,
): ErrorEnvelope {
  return {
    success: false,
    statusCode,
    message,
    error,
    timestamp: new Date().toISOString(),
    path: request.url,
  };
}

/** Sends the standard error envelope with the given status. */
export function sendErrorEnvelope(
  response: Response,
  request: Request,
  statusCode: number,
  message: string | string[],
  error: string,
): void {
  response
    .status(statusCode)
    .json(buildErrorEnvelope(request, statusCode, message, error));
}
