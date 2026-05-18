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

import authRoutes          from "./routes/auth";
import usersRoutes         from "./routes/users";
import demandsRoutes       from "./routes/demands";
import proposalsRoutes     from "./routes/proposals";
import ordersRoutes        from "./routes/orders";
import machinesRoutes      from "./routes/machines";
import companiesRoutes     from "./routes/companies";
import contractsRoutes     from "./routes/contracts";
import ndasRoutes          from "./routes/ndas";
import transactionsRoutes  from "./routes/transactions";
import disputesRoutes      from "./routes/disputes";
import reviewsRoutes       from "./routes/reviews";
import recurringRoutes     from "./routes/recurring";
import auditRoutes         from "./routes/audit";
import notificationsRoutes from "./routes/notifications";
import messagesRoutes      from "./routes/messages";
import calendarRoutes      from "./routes/calendar";
import verificationRoutes  from "./routes/verification";
import eventsRoutes        from "./routes/events";
import uploadsRoutes       from "./routes/uploads";
import feedbackRoutes      from "./routes/feedback";
import adminRoutes         from "./routes/admin";
import proposalTemplatesRoutes from "./routes/proposal-templates";
import sitemapRoutes       from "./routes/sitemap";
import statusRoutes        from "./routes/status";
import { stripeWebhook } from "./routes/stripe-webhook";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./lib/swagger";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const corsOrigins = process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()).filter(Boolean) || ["http://localhost:3000"];

void initErrorTracking();

function rateLimitKey(req: Request): string {
  const tokenInfo = getAccessTokenFromRequest(req);
  if (tokenInfo) {
    try {
      const payload = jwt.verify(tokenInfo.token, JWT_SECRET) as JwtPayload;
      if (payload.userId) return `user:${payload.userId}`;
    } catch {
      // authenticate retornara 401 depois; aqui apenas caimos para IP.
    }
  }
  return `ip:${req.ip || "unknown"}`;
}

export const app = express();

app.set("trust proxy", 1);
app.use(requestIdMiddleware);
app.use(metricsMiddleware);
app.use(compression({ level: 6, threshold: 1024 }));

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
      upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
      ...(process.env.CSP_REPORT_URI ? { reportUri: [process.env.CSP_REPORT_URI] as string[] } : {}),
    },
  },
  strictTransportSecurity: process.env.NODE_ENV === "production"
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
app.post("/api/transactions/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhook);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 500,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: rateLimitKey,
  message: { error: "Muitas requisicoes. Tente novamente em 15 minutos." },
  skip: (req) => req.path === "/health" || req.path.startsWith("/health/") || req.path === "/metrics" || req.path.startsWith("/api/events"),
});
app.use(globalLimiter);

function protectMetrics(req: Request, res: Response, next: NextFunction): void {
  const token = process.env.METRICS_TOKEN;
  if (!token && process.env.NODE_ENV !== "production") return next();
  const supplied = req.get("x-metrics-token") || req.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (token && supplied === token) return next();
  res.status(404).json({ error: "Rota nao encontrada." });
}

app.get("/metrics", protectMetrics, metricsHandler);

const docsEnabled =
  process.env.NODE_ENV !== "production" ||
  process.env.ENABLE_API_DOCS === "true";

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

export async function readinessChecks(): Promise<Record<string, { ok: boolean; detail?: unknown }>> {
  const checks: Record<string, { ok: boolean; detail?: unknown }> = {};

  try {
    await pool.query("SELECT 1");
    checks.db = {
      ok: true,
      detail: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      },
    };
  } catch (err) {
    checks.db = { ok: false, detail: (err as Error).message };
  }

  try {
    checks.redis = { ok: (await pingRedis()) === "PONG" };
  } catch (err) {
    checks.redis = { ok: false, detail: (err as Error).message };
  }

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

  try {
    const { rows } = await pool.query<{ id: string; applied_at: string }>(
      `SELECT id, applied_at
       FROM schema_migrations
       ORDER BY applied_at DESC
       LIMIT 1`
    );
    checks.migrations = { ok: true, detail: rows[0] || { applied: 0 } };
  } catch (err) {
    checks.migrations = { ok: false, detail: (err as Error).message };
  }

  try {
    await ensureUploadStorageReady();
    checks.uploads = { ok: true };
  } catch (err) {
    checks.uploads = { ok: false, detail: (err as Error).message };
  }

  return checks;
}

app.get("/health/live", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    ts: new Date().toISOString(),
  });
});

app.get(["/health", "/health/ready"], async (_req, res) => {
  const checks = await readinessChecks();
  const ok = Object.values(checks).every((c) => c.ok);
  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "error",
    checks,
    ts: new Date().toISOString(),
  });
});

app.use("/api/auth",          authRoutes);
app.use("/api/users",         usersRoutes);
app.use("/api/demands",       demandsRoutes);
app.use("/api/proposals",     proposalsRoutes);
app.use("/api/orders",        ordersRoutes);
app.use("/api/machines",      machinesRoutes);
app.use("/api/companies",     companiesRoutes);
app.use("/api/contracts",     contractsRoutes);
app.use("/api/ndas",          ndasRoutes);
app.use("/api/transactions",  transactionsRoutes);
app.use("/api/disputes",      disputesRoutes);
app.use("/api/reviews",       reviewsRoutes);
app.use("/api/recurring",     recurringRoutes);
app.use("/api/audit",         auditRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/messages",      messagesRoutes);
app.use("/api/calendar",      calendarRoutes);
app.use("/api/verification",  verificationRoutes);
app.use("/api/events",        eventsRoutes);
app.use("/api/uploads",       uploadsRoutes);
app.use("/api/feedback",      feedbackRoutes);
app.use("/api/admin",         adminRoutes);
app.use("/api/proposal-templates", proposalTemplatesRoutes);
app.use("/",                  sitemapRoutes);
app.use("/api",               statusRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Rota nao encontrada." });
});

app.use(errorHandler);

export default app;
