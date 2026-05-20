import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";

import { pool } from "./db";
import { errorHandler } from "./middleware/error";
import { getAccessTokenFromRequest, JwtPayload } from "./middleware/auth";
import { logger, requestIdMiddleware, requestLogMiddleware } from "./lib/logger";
import { initErrorTracking } from "./lib/error-tracking";
import { pingRedis } from "./lib/redis";
import { ensureUploadStorageReady } from "./lib/upload";
import { metricsHandler, metricsMiddleware } from "./lib/metrics";
import { requestMetrics } from "./middleware/requestMetrics";
import { env } from "./config/env";

import v1Routes          from "./routes/v1";
import sitemapRoutes     from "./routes/sitemap";
import statusRoutes      from "./routes/status";
import { stripeWebhook } from "./routes/stripe-webhook";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./lib/swagger";

const JWT_SECRET = env.JWT_SECRET;
const corsOrigins = env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean);

void initErrorTracking();

function rateLimitKey(req: Request): string {
  const tokenInfo = getAccessTokenFromRequest(req);
  if (tokenInfo) {
    try {
      const payload = jwt.verify(tokenInfo.token, JWT_SECRET) as JwtPayload;
      if (payload.userId) return `user:${payload.userId}`;
    } catch {
      // fall through to IP
    }
  }
  return `ip:${req.ip || "unknown"}`;
}

export const app = express();

app.set("trust proxy", 1);
app.use(requestIdMiddleware);
app.use(metricsMiddleware);
app.use(compression({ level: 6, threshold: 1024 }));

// Inject X-API-Version on every response
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-API-Version", "1.0");
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      connectSrc: ["'self'", ...corsOrigins, "https://api.stripe.com"],
      scriptSrc: ["'self'", "https://js.stripe.com"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
      upgradeInsecureRequests: env.NODE_ENV === "production" ? [] : null,
      ...(process.env.CSP_REPORT_URI ? { reportUri: [process.env.CSP_REPORT_URI] as string[] } : {}),
    },
  },
  strictTransportSecurity: env.NODE_ENV === "production"
    ? { maxAge: 63072000, includeSubDomains: true, preload: true }
    : false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
}));

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader(
    "Permissions-Policy",
    [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=(self)",
      "fullscreen=(self)",
      "interest-cohort=()",
    ].join(", ")
  );
  next();
});
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));
app.use(requestLogMiddleware);
app.use(requestMetrics);

// Stripe webhook must come before express.json() to receive raw body
app.post("/api/transactions/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhook);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: rateLimitKey,
  message: { error: "Muitas requisicoes. Tente novamente em 15 minutos." },
  skip: (req) => req.path === "/health" || req.path.startsWith("/health/") || req.path === "/metrics" || req.path.startsWith("/api/events"),
});
app.use(globalLimiter);

function protectMetrics(req: Request, res: Response, next: NextFunction): void {
  const token = env.METRICS_TOKEN;
  if (!token && env.NODE_ENV !== "production") return next();
  const supplied = req.get("x-metrics-token") || req.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (token && supplied === token) return next();
  res.status(404).json({ error: "Rota nao encontrada." });
}

app.get("/metrics", protectMetrics, metricsHandler);

const docsEnabled = env.NODE_ENV !== "production" || env.ENABLE_API_DOCS;

if (docsEnabled) {
  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: "CapaCity API Docs",
      swaggerOptions: { persistAuthorization: true },
    })
  );
  app.get("/docs.json", (_req, res) => res.json(swaggerSpec));
} else {
  app.use("/docs", (_req: Request, res: Response) => {
    res.status(403).json({ error: "Documentação desativada em produção.", code: "DOCS_DISABLED" });
  });
  app.get("/docs.json", (_req: Request, res: Response) => {
    res.status(403).json({ error: "Documentação desativada em produção.", code: "DOCS_DISABLED" });
  });
}

export interface ServiceCheck {
  ok: boolean;
  latencyMs?: number;
  detail?: unknown;
}

export async function readinessChecks(): Promise<Record<string, ServiceCheck>> {
  const checks: Record<string, ServiceCheck> = {};

  // DB check with latency
  const dbStart = Date.now();
  try {
    await pool.query("SELECT 1");
    const latencyMs = Date.now() - dbStart;
    checks.db = {
      ok: true,
      latencyMs,
      detail: { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount },
    };
  } catch (err) {
    checks.db = { ok: false, latencyMs: Date.now() - dbStart, detail: (err as Error).message };
  }

  // Redis check with latency
  const redisStart = Date.now();
  try {
    checks.redis = { ok: (await pingRedis()) === "PONG", latencyMs: Date.now() - redisStart };
  } catch (err) {
    checks.redis = { ok: false, latencyMs: Date.now() - redisStart, detail: (err as Error).message };
  }

  // Sequences check
  try {
    const requiredSequences = [
      "seq_demand_id", "seq_proposal_id", "seq_order_id", "seq_contract_id",
      "seq_nda_id", "seq_dispute_id", "seq_review_id", "seq_txn_id", "seq_recur_id",
    ];
    const { rows } = await pool.query<{ name: string; exists: boolean }>(
      `SELECT name, to_regclass(name) IS NOT NULL AS exists
       FROM unnest($1::text[]) AS name`,
      [requiredSequences]
    );
    const missing = rows.filter((r) => !r.exists).map((r) => r.name);
    checks.sequences = { ok: missing.length === 0, detail: missing.length ? { missing } : undefined };
  } catch (err) {
    checks.sequences = { ok: false, detail: (err as Error).message };
  }

  // Migrations check — also surfaces lastMigration at top level via detail
  try {
    const { rows } = await pool.query<{ id: string; applied_at: string }>(
      `SELECT id, applied_at FROM schema_migrations ORDER BY applied_at DESC LIMIT 1`
    );
    checks.migrations = { ok: true, detail: rows[0] || { applied: 0 } };
  } catch (err) {
    checks.migrations = { ok: false, detail: (err as Error).message };
  }

  // Storage check
  try {
    await ensureUploadStorageReady();
    checks.uploads = { ok: true };
  } catch (err) {
    checks.uploads = { ok: false, detail: (err as Error).message };
  }

  return checks;
}

app.get("/health/live", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), ts: new Date().toISOString() });
});

app.get(["/health", "/health/ready"], async (_req, res) => {
  const checks = await readinessChecks();
  const ok = Object.values(checks).every((c) => c.ok);

  const mem = process.memoryUsage();
  const toMB = (b: number) => `${Math.round(b / 1024 / 1024)}MB`;

  // Extract lastMigration for top-level convenience
  const migDetail = checks.migrations?.detail as { id?: string; applied_at?: string } | undefined;
  const lastMigration = migDetail?.id ?? null;

  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "error",
    version: process.env.npm_package_version || process.env.GIT_SHA || "dev",
    uptime: Math.floor(process.uptime()),
    memory: {
      heapUsed: toMB(mem.heapUsed),
      heapTotal: toMB(mem.heapTotal),
      rss: toMB(mem.rss),
      external: toMB(mem.external),
    },
    checks,
    lastMigration,
    ts: new Date().toISOString(),
  });
});

// v1 routes mounted at /api/v1 (canonical) and /api (backward compat alias)
app.use("/api/v1", v1Routes);
app.use("/api",    v1Routes);

app.use("/",    sitemapRoutes);
app.use("/api", statusRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Rota nao encontrada." });
});

app.use(errorHandler);

export default app;
