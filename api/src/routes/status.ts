import { Router, Request, Response, NextFunction } from "express";
import { pool, query } from "../db";
import { pingRedis } from "../lib/redis";
import { isStripeEnabled } from "../lib/stripe";

const router = Router();

router.get("/status", async (_req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const checks: Record<string, { status: "operational" | "degraded" | "outage"; latency_ms?: number; message?: string }> = {};

  const dbStart = Date.now();
  try {
    await pool.query("SELECT 1");
    const latency = Date.now() - dbStart;
    checks.database = { status: latency < 200 ? "operational" : "degraded", latency_ms: latency };
  } catch { checks.database = { status: "outage", message: "Não foi possível conectar ao banco" }; }

  const redisStart = Date.now();
  try {
    const pong = await pingRedis();
    const latency = Date.now() - redisStart;
    checks.cache = { status: pong === "PONG" ? (latency < 100 ? "operational" : "degraded") : "outage", latency_ms: latency };
  } catch { checks.cache = { status: "outage", message: "Redis indisponível" }; }

  checks.api = { status: "operational", latency_ms: Date.now() - start };
  checks.payments = { status: isStripeEnabled() ? "operational" : "degraded", message: isStripeEnabled() ? undefined : "Stripe não configurado (modo manual)" };

  try {
    const { rows } = await query<{ count: string }>(`SELECT COUNT(*)::TEXT AS count FROM security_events WHERE severity = 'critical' AND created_at > NOW() - INTERVAL '24 hours'`);
    const criticalCount = Number(rows[0]?.count || 0);
    checks.errors = { status: criticalCount === 0 ? "operational" : criticalCount < 5 ? "degraded" : "outage", message: criticalCount > 0 ? `${criticalCount} erros críticos nas últimas 24h` : undefined };
  } catch { checks.errors = { status: "operational" }; }

  const states = Object.values(checks).map((c) => c.status);
  const overall: "operational" | "degraded" | "outage" = states.includes("outage") ? "outage" : states.includes("degraded") ? "degraded" : "operational";
  res.status(overall === "outage" ? 503 : 200).json({ status: overall, ts: new Date().toISOString(), uptime_seconds: Math.floor(process.uptime()), version: process.env.npm_package_version || process.env.GIT_SHA || "dev", services: checks });
});

router.get("/status/incidents", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(`SELECT DATE_TRUNC('day', created_at) AS day, COUNT(*) FILTER (WHERE severity = 'critical') AS critical, COUNT(*) FILTER (WHERE severity = 'warning') AS warnings FROM security_events WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY 1 ORDER BY 1 DESC`);
    res.json({ period: "30 days", days: rows.map((r: any) => ({ date: new Date(r.day).toISOString().split("T")[0], critical: Number(r.critical), warnings: Number(r.warnings) })) });
  } catch (err) { next(err); }
});

export default router;
