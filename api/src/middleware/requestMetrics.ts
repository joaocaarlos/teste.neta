import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

const SLOW_THRESHOLD_MS = 500;

/**
 * Request metrics middleware.
 * Logs every request with method, path, statusCode, durationMs, userId (if authenticated) and client IP.
 * Logs slow requests (> 500 ms) at WARN level.
 * Logs 5xx responses at ERROR level including the error stack when available.
 */
export function requestMetrics(req: Request, res: Response, next: NextFunction): void {
  const startAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startAt) / 1_000_000;
    const { method, path: reqPath, ip } = req;
    const statusCode = res.statusCode;
    const userId: string | undefined = req.user?.userId;

    const meta = {
      method,
      path: reqPath,
      statusCode,
      durationMs: Math.round(durationMs),
      userId,
      ip,
    };

    if (statusCode >= 500) {
      // Retrieve error attached by error-handler middleware when available
      const err = (res as Response & { locals: Record<string, unknown> }).locals?.err as Error | undefined;
      logger.error(
        { ...meta, stack: err?.stack },
        `${method} ${reqPath} → ${statusCode} (${Math.round(durationMs)}ms) [ERROR]`
      );
    } else if (durationMs > SLOW_THRESHOLD_MS) {
      logger.warn(meta, `${method} ${reqPath} → ${statusCode} (${Math.round(durationMs)}ms) [SLOW]`);
    } else {
      logger.info(meta, `${method} ${reqPath} → ${statusCode} (${Math.round(durationMs)}ms)`);
    }
  });

  next();
}
