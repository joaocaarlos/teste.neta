import crypto from "crypto";
import pino from "pino";
import pinoHttp from "pino-http";
import { Request, Response, NextFunction } from "express";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "password",
    "token",
    "access_token",
    "refresh_token",
    "refreshToken",
    "csrfToken",
    "secret",
    "apiKey"
  ]
});

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers["x-request-id"] as string) || crypto.randomUUID();
  (req as Request & { id?: string }).id = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}

export const requestLogMiddleware = pinoHttp({ logger });
