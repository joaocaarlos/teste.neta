/**
 * validation.test.ts
 *
 * Tests for Zod validation on auth routes (login / register).
 * Uses supertest against the Express app with all I/O dependencies mocked.
 */

import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";

// ── Mock all I/O before importing the app ─────────────────────────────────────

vi.mock("../../db", () => ({
  pool: { query: vi.fn(), connect: vi.fn(), totalCount: 0, idleCount: 0, waitingCount: 0 },
  query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
}));

vi.mock("../../lib/redis", () => ({
  redis: {
    status: "ready",
    connect: vi.fn(),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
    ttl: vi.fn().mockResolvedValue(-2),
  },
  pingRedis: vi.fn().mockResolvedValue("PONG"),
}));

vi.mock("../../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  requestIdMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
  requestLogMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock("../../lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  emailTemplates: {
    welcome: vi.fn().mockReturnValue({ subject: "s", html: "h" }),
    emailVerify: vi.fn().mockReturnValue({ subject: "s", html: "h" }),
    passwordReset: vi.fn().mockReturnValue({ subject: "s", html: "h" }),
  },
}));

vi.mock("../../lib/tokens", () => ({
  issueToken: vi.fn().mockResolvedValue({ plain: "tok", id: "id" }),
  issueRefreshToken: vi.fn().mockResolvedValue({
    refreshToken: "rt",
    expiresAt: new Date(Date.now() + 86400_000),
    sessionId: "sid",
  }),
  consumeToken: vi.fn().mockResolvedValue({ valid: false, userId: null }),
  revokeSession: vi.fn().mockResolvedValue(true),
  rotateRefreshToken: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../lib/audit", () => ({
  audit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../lib/security-events", () => ({
  logSecurityEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../lib/password-policy", () => ({
  checkPasswordStrength: vi.fn().mockReturnValue({ ok: true, errors: [], strength: "strong" }),
}));

const mockSingle = vi.fn().mockReturnValue((_req: unknown, _res: unknown, next: () => void) => next());
const mockArray = vi.fn().mockReturnValue((_req: unknown, _res: unknown, next: () => void) => next());
const mockUploaderInstance = { single: mockSingle, array: mockArray };

vi.mock("../../lib/upload", () => ({
  ensureUploadStorageReady: vi.fn().mockResolvedValue(undefined),
  makeUploader: vi.fn().mockReturnValue(mockUploaderInstance),
  persistUpload: vi.fn(),
  isS3StorageEnabled: vi.fn().mockReturnValue(false),
  UPLOAD_DIR: "/tmp/test-uploads",
  fileFullPath: vi.fn(),
}));

vi.mock("../../lib/metrics", () => ({
  metricsHandler: (_req: unknown, res: { json: (v: unknown) => void }) => res.json({}),
  metricsMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock("../../middleware/requestMetrics", () => ({
  requestMetrics: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock("../../lib/error-tracking", () => ({
  initErrorTracking: vi.fn().mockResolvedValue(undefined),
  captureException: vi.fn(),
}));

vi.mock("../../lib/business-metrics", () => ({
  recordDemandCreated: vi.fn(),
  recordProposalCreated: vi.fn(),
}));

vi.mock("../../lib/swagger", () => ({
  swaggerSpec: {},
}));

vi.mock("../../lib/stripe", () => ({ stripe: null }));
vi.mock("../../lib/stripe-connect", () => ({}));
vi.mock("../../lib/sse", () => ({}));
vi.mock("../../lib/score", () => ({}));
vi.mock("../../lib/alerts", () => ({}));
vi.mock("../../lib/kyc", () => ({}));
vi.mock("../../lib/email-queue", () => ({}));
vi.mock("../../cron/index", () => ({}));

// ── Load app after mocks ───────────────────────────────────────────────────────

let app: import("express").Express;

beforeAll(async () => {
  const mod = await import("../../app");
  app = mod.app;
});

// ── POST /api/v1/auth/login — Zod validation ──────────────────────────────────

describe("POST /api/v1/auth/login — Zod validation", () => {
  it("returns 400 when email is invalid", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "not-an-email", password: "secret123" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Dados inválidos");
    expect(res.body).toHaveProperty("details");
    expect(Array.isArray(res.body.details)).toBe(true);
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it("returns 400 when email field is absent", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ password: "secret123" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Dados inválidos");
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it("returns 400 when password field is absent", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "user@example.com" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Dados inválidos");
  });

  it("returns 400 when both email and password are absent", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Dados inválidos");
    expect(res.body.details.length).toBeGreaterThanOrEqual(2);
  });

  it("details array items have field and message properties", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "bad", password: "secret123" });

    expect(res.status).toBe(400);
    const details = res.body.details as Array<{ field: string; message: string }>;
    expect(details.length).toBeGreaterThan(0);
    for (const d of details) {
      expect(d).toHaveProperty("field");
      expect(d).toHaveProperty("message");
    }
  });
});

// ── POST /api/v1/auth/register — Zod validation ───────────────────────────────

describe("POST /api/v1/auth/register — Zod validation", () => {
  it("returns 400 when password is shorter than 8 characters", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Maria Silva",
        email: "maria@example.com",
        password: "short",  // < 8 chars
        role: "fornecedor",
        companyName: "Empresa Ltda",
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Dados inválidos");
    const details = res.body.details as Array<{ field: string; message: string }>;
    const pwdError = details.find((d) => d.field === "password");
    expect(pwdError).toBeDefined();
  });

  it("returns 400 when email is invalid in register", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Maria Silva",
        email: "not-a-valid-email",
        password: "validpassword1",
        role: "fornecedor",
        companyName: "Empresa Ltda",
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Dados inválidos");
    const details = res.body.details as Array<{ field: string; message: string }>;
    const emailError = details.find((d) => d.field === "email");
    expect(emailError).toBeDefined();
  });

  it("returns 400 when required fields are absent", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Dados inválidos");
    expect(res.body.details.length).toBeGreaterThanOrEqual(3);
  });

  it("returns 400 when role is invalid", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "João Costa",
        email: "joao@example.com",
        password: "strongpass1",
        role: "admin",          // not allowed in register schema
        companyName: "Empresa SA",
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Dados inválidos");
  });

  it("returns 400 when companyName is missing", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "João Costa",
        email: "joao@example.com",
        password: "strongpass1",
        role: "demandante",
        // companyName omitted
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Dados inválidos");
  });
});
