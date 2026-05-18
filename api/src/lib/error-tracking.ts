import { Request } from "express";
import { logger } from "./logger";

type SentryModule = typeof import("@sentry/node");

let sentry: SentryModule | null = null;
let initAttempted = false;

export async function initErrorTracking(): Promise<void> {
  if (initAttempted) return;
  initAttempted = true;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.debug("[sentry] SENTRY_DSN não configurado — skip");
    return;
  }

  try {
    sentry = await import("@sentry/node");
    sentry.init({
      dsn,
      environment: process.env.NODE_ENV || "development",
      release: process.env.SENTRY_RELEASE || process.env.GIT_SHA,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
      profilesSampleRate: Number(process.env.SENTRY_PROFILES_SAMPLE_RATE || 0),
      sendDefaultPii: false,
      beforeSend(event) {
        if (event.exception?.values?.[0]?.value?.includes("ECONNRESET")) return null;
        return event;
      },
      ignoreErrors: ["AbortError", "ECONNRESET", "EPIPE", "ValidationError"],
    });
    logger.info({ environment: process.env.NODE_ENV }, "[sentry] initialized");
  } catch (err) {
    logger.warn({ err }, "[sentry] failed to initialize — package missing?");
  }
}

export function addBreadcrumb(opts: { category: string; message: string; data?: Record<string, unknown>; level?: "info" | "warning" | "error" }): void {
  sentry?.addBreadcrumb({
    category: opts.category,
    message: opts.message,
    level: opts.level || "info",
    data: opts.data,
  });
}

export function captureException(err: unknown, req?: Request): void {
  if (!sentry) return;
  sentry.withScope((scope) => {
    if (req?.id) scope.setTag("request_id", req.id);
    if (req?.user?.userId) scope.setUser({ id: req.user.userId });
    if (req) {
      scope.setContext("request", {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
      });
    }
    sentry!.captureException(err);
  });
}
