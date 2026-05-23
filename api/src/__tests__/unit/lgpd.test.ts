/**
 * lgpd.test.ts
 *
 * Tests for LGPD endpoints:
 *   GET  /api/v1/users/me/lgpd/consents
 *   POST /api/v1/users/me/lgpd/consent
 *
 * All I/O is mocked; a JWT is injected to simulate an authenticated user.
 */

import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

// ── Mocks (same pattern as validation.test.ts) ────────────────────────────────

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

// ── Load app + DB mock handles after mocks ────────────────────────────────────

let app: import("express").Express;

const JWT_SECRET = "test-secret-at-least-32-chars-long";
const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

function makeAuthToken(userId = TEST_USER_ID, role = "fornecedor") {
  return jwt.sign(
    { userId, role, companyId: null },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

beforeAll(async () => {
  const mod = await import("../../app");
  app = mod.app;
});

// ── GET /api/v1/users/me/lgpd/consents ────────────────────────────────────────

describe("GET /api/v1/users/me/lgpd/consents", () => {
  it("returns 401 when no auth token is provided", async () => {
    const res = await request(app).get("/api/v1/users/me/lgpd/consents");
    expect(res.status).toBe(401);
  });

  it("returns 200 and an array when authenticated", async () => {
    // DB mock returns empty rows (user has no consents yet)
    const { query } = await import("../../db");
    vi.mocked(query).mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const token = makeAuthToken();
    const res = await request(app)
      .get("/api/v1/users/me/lgpd/consents")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns 200 with consent records when they exist", async () => {
    const fakeConsents = [
      { id: "c1", purpose: "analytics", granted: true, created_at: new Date().toISOString() },
      { id: "c2", purpose: "marketing", granted: false, created_at: new Date().toISOString() },
    ];
    const { query } = await import("../../db");
    vi.mocked(query).mockResolvedValueOnce({ rows: fakeConsents, rowCount: 2 } as never);

    const token = makeAuthToken();
    const res = await request(app)
      .get("/api/v1/users/me/lgpd/consents")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    expect(res.body[0]).toHaveProperty("purpose", "analytics");
  });
});

// ── POST /api/v1/users/me/lgpd/consent ────────────────────────────────────────

describe("POST /api/v1/users/me/lgpd/consent", () => {
  it("returns 401 when no auth token is provided", async () => {
    const res = await request(app)
      .post("/api/v1/users/me/lgpd/consent")
      .send({ purpose: "analytics", granted: true });

    expect(res.status).toBe(401);
  });

  it("returns 400 when purpose is missing", async () => {
    const token = makeAuthToken();
    const res = await request(app)
      .post("/api/v1/users/me/lgpd/consent")
      .set("Authorization", `Bearer ${token}`)
      .send({ granted: true });

    expect(res.status).toBe(400);
  });

  it("returns 400 when granted is missing", async () => {
    const token = makeAuthToken();
    const res = await request(app)
      .post("/api/v1/users/me/lgpd/consent")
      .set("Authorization", `Bearer ${token}`)
      .send({ purpose: "analytics" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when purpose has an invalid value", async () => {
    const token = makeAuthToken();
    const res = await request(app)
      .post("/api/v1/users/me/lgpd/consent")
      .set("Authorization", `Bearer ${token}`)
      .send({ purpose: "invalid_purpose", granted: true });

    expect(res.status).toBe(400);
  });

  it("returns 201 and the saved consent when input is valid", async () => {
    const savedConsent = {
      id: "consent-id-1",
      purpose: "analytics",
      granted: true,
      created_at: new Date().toISOString(),
    };
    const { query } = await import("../../db");
    vi.mocked(query).mockResolvedValueOnce({ rows: [savedConsent], rowCount: 1 } as never);

    const token = makeAuthToken();
    const res = await request(app)
      .post("/api/v1/users/me/lgpd/consent")
      .set("Authorization", `Bearer ${token}`)
      .send({ purpose: "analytics", granted: true });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("purpose", "analytics");
    expect(res.body).toHaveProperty("granted", true);
  });

  it("returns 201 for each valid purpose value", async () => {
    const purposes = ["analytics", "marketing", "essential"] as const;
    const token = makeAuthToken();
    const { query } = await import("../../db");

    for (const purpose of purposes) {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ id: "cid", purpose, granted: true, created_at: new Date().toISOString() }],
        rowCount: 1,
      } as never);

      const res = await request(app)
        .post("/api/v1/users/me/lgpd/consent")
        .set("Authorization", `Bearer ${token}`)
        .send({ purpose, granted: true });

      expect(res.status).toBe(201);
    }
  });

  it("accepts granted: false to revoke consent", async () => {
    const { query } = await import("../../db");
    vi.mocked(query).mockResolvedValueOnce({
      rows: [{ id: "cid", purpose: "marketing", granted: false, created_at: new Date().toISOString() }],
      rowCount: 1,
    } as never);

    const token = makeAuthToken();
    const res = await request(app)
      .post("/api/v1/users/me/lgpd/consent")
      .set("Authorization", `Bearer ${token}`)
      .send({ purpose: "marketing", granted: false });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("granted", false);
  });
});
