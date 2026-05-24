import { Request } from "express";
import { logger } from "./logger";

const lastSent = new Map<string, number>();

export async function notifyServerError(err: Error, req: Request): Promise<void> {
  const webhook = process.env.ERROR_WEBHOOK_URL;
  if (!webhook) return;

  const key = `${err.name}:${err.message}:${req.method}:${req.path}`;
  const now = Date.now();
  const minIntervalMs = Number(process.env.ERROR_WEBHOOK_MIN_INTERVAL_MS) || 60_000;
  if ((lastSent.get(key) || 0) + minIntervalMs > now) return;
  lastSent.set(key, now);

  const text = [
    "*CapaCity API 5xx*",
    `Request: ${req.method} ${req.originalUrl}`,
    `Status: ${(err as { statusCode?: number }).statusCode || 500}`,
    `RequestId: ${req.id || "-"}`,
    `User: ${req.user?.userId || "-"}`,
    `Error: ${err.name}: ${err.message}`,
  ].join("\n");

  try {
    const body = webhook.includes("discord")
      ? { content: text.replace(/\*/g, "**") }
      : { text };

    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (alertErr) {
    logger.warn({ err: alertErr }, "[alerts] failed to send 5xx webhook");
  }
}
