import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";
import { captureException } from "../lib/error-tracking";
import { notifyServerError } from "../lib/alerts";
import {
  ApplicationError,
  isApplicationError,
  parseDatabaseError,
  ValidationError,
} from "../lib/errors";
import { ApiErrorResponse } from "../lib/response";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.id;
  const log = req.log || logger;

  // Tentar parsear como erro de BD
  let appError: ApplicationError;

  if (isApplicationError(err)) {
    appError = err as ApplicationError;
  } else if ((err as any).code && typeof (err as any).code === "string") {
    // Erro PostgreSQL
    appError = parseDatabaseError(err);
  } else if (err instanceof ApplicationError) {
    appError = err;
  } else {
    // Erro genérico
    appError = new ApplicationError("Erro interno do servidor.", {
      code: "INTERNAL_ERROR",
      statusCode: 500,
    });
  }

  const { statusCode, message, code } = appError;
  const logLevel = statusCode >= 500 ? "error" : "warn";

  log[logLevel as "error" | "warn"](
    {
      err,
      requestId,
      path: req.originalUrl,
      method: req.method,
      userId: req.user?.userId,
      errorCode: code,
      statusCode,
    },
    message
  );

  // Notificar servidor de erro crítico
  if (statusCode >= 500) {
    captureException(err, req);
    void notifyServerError(err, req);
  }

  const response: ApiErrorResponse = {
    error: message,
    code,
    requestId,
    timestamp: new Date().toISOString(),
  };

  if (appError.detail) {
    response.detail = appError.detail;
  }

  res.status(statusCode).json(response);
}

/**
 * @deprecated Use ApplicationError e suas subclasses
 */
export class AppError extends ApplicationError {
  constructor(message: string, statusCode = 400) {
    super(message, {
      code: statusCode >= 500 ? "INTERNAL_ERROR" : "VALIDATION_ERROR",
      statusCode,
    });
  }
}
