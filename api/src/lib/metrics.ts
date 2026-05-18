import { NextFunction, Request, Response } from "express";
import client from "prom-client";

export const metricsRegistry = new client.Registry();

client.collectDefaultMetrics({
  register: metricsRegistry,
  prefix: "capacity_",
});

const httpRequests = new client.Counter({
  name: "capacity_http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [metricsRegistry],
});

const httpDuration = new client.Histogram({
  name: "capacity_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [metricsRegistry],
});

function normalizeRoute(path: string): string {
  return path
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":uuid")
    .replace(/\b(DM|PR|OR|CT|ND|DP|RV|TX|RC|MQ)-[0-9]+\b/g, "$1-:id")
    .replace(/\/[0-9]+(?=\/|$)/g, "/:id");
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.path === "/metrics") return next();
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const elapsed = Number(process.hrtime.bigint() - start) / 1_000_000_000;
    const labels = {
      method: req.method,
      route: normalizeRoute(req.route?.path ? req.baseUrl + String(req.route.path) : req.path),
      status_code: String(res.statusCode),
    };
    httpRequests.inc(labels);
    httpDuration.observe(labels, elapsed);
  });

  next();
}

export async function metricsHandler(_req: Request, res: Response): Promise<void> {
  res.setHeader("Content-Type", metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
}
