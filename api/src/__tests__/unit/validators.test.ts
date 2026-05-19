import { describe, it, expect, vi } from "vitest";
import { validate, v } from "../../lib/validators";

// Helper: run a single ValidationChain against a fake request body
async function runChain(chain: ReturnType<typeof v.email>, body: Record<string, unknown>) {
  const req = { body, params: {}, query: {}, headers: {} } as unknown as import("express").Request;
  await chain.run(req);
  const { validationResult } = await import("express-validator");
  return validationResult(req);
}

// ── v.email ─────────────────────────────────────────────────────────────────

describe("v.email()", () => {
  it("accepts a valid email address", async () => {
    const result = await runChain(v.email(), { email: "user@example.com" });
    expect(result.isEmpty()).toBe(true);
  });

  it("rejects an invalid email address", async () => {
    const result = await runChain(v.email(), { email: "not-an-email" });
    expect(result.isEmpty()).toBe(false);
  });

  it("rejects an empty string as email", async () => {
    const result = await runChain(v.email(), { email: "" });
    expect(result.isEmpty()).toBe(false);
  });

  it("works with a custom field name", async () => {
    const chain = v.email("contactEmail");
    const req = { body: { contactEmail: "bad" }, params: {}, query: {}, headers: {} } as unknown as import("express").Request;
    await chain.run(req);
    const { validationResult } = await import("express-validator");
    const result = validationResult(req);
    expect(result.isEmpty()).toBe(false);
  });
});

// ── v.password ───────────────────────────────────────────────────────────────

describe("v.password()", () => {
  it("rejects a password shorter than 8 characters", async () => {
    const result = await runChain(v.password(), { password: "short" });
    expect(result.isEmpty()).toBe(false);
  });

  it("accepts a password with exactly 8 characters", async () => {
    const result = await runChain(v.password(), { password: "12345678" });
    expect(result.isEmpty()).toBe(true);
  });

  it("accepts a long password", async () => {
    const result = await runChain(v.password(), { password: "a".repeat(128) });
    expect(result.isEmpty()).toBe(true);
  });

  it("rejects a password longer than 128 characters", async () => {
    const result = await runChain(v.password(), { password: "a".repeat(129) });
    expect(result.isEmpty()).toBe(false);
  });
});

// ── v.notEmptyString ─────────────────────────────────────────────────────────

describe("v.notEmptyString()", () => {
  it("rejects an empty string", async () => {
    const result = await runChain(v.notEmptyString("name"), { name: "" });
    expect(result.isEmpty()).toBe(false);
  });

  it("accepts a normal non-empty string", async () => {
    const result = await runChain(v.notEmptyString("name"), { name: "João" });
    expect(result.isEmpty()).toBe(true);
  });

  it("rejects a string exceeding the max length", async () => {
    const result = await runChain(v.notEmptyString("name", 5), { name: "toolong" });
    expect(result.isEmpty()).toBe(false);
  });

  it("rejects a whitespace-only string", async () => {
    const result = await runChain(v.notEmptyString("name"), { name: "   " });
    expect(result.isEmpty()).toBe(false);
  });
});

// ── v.enumOneOf ──────────────────────────────────────────────────────────────

describe("v.enumOneOf()", () => {
  it("rejects a value not in the allowed list", async () => {
    const result = await runChain(v.enumOneOf("role", ["a", "b"]), { role: "c" });
    expect(result.isEmpty()).toBe(false);
  });

  it("accepts a value that is in the allowed list", async () => {
    const result = await runChain(v.enumOneOf("role", ["a", "b"]), { role: "a" });
    expect(result.isEmpty()).toBe(true);
  });
});

// ── v.intRange ───────────────────────────────────────────────────────────────

describe("v.intRange()", () => {
  it("rejects a value below the minimum", async () => {
    const result = await runChain(v.intRange("n", 1, 10), { n: 0 });
    expect(result.isEmpty()).toBe(false);
  });

  it("rejects a value above the maximum", async () => {
    const result = await runChain(v.intRange("n", 1, 10), { n: 11 });
    expect(result.isEmpty()).toBe(false);
  });

  it("accepts a value within the allowed range", async () => {
    const result = await runChain(v.intRange("n", 1, 10), { n: 5 });
    expect(result.isEmpty()).toBe(true);
  });

  it("accepts the boundary minimum value", async () => {
    const result = await runChain(v.intRange("n", 1, 10), { n: 1 });
    expect(result.isEmpty()).toBe(true);
  });

  it("accepts the boundary maximum value", async () => {
    const result = await runChain(v.intRange("n", 1, 10), { n: 10 });
    expect(result.isEmpty()).toBe(true);
  });
});

// ── validate() middleware ─────────────────────────────────────────────────────

function makeMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
  return res as unknown as import("express").Response & typeof res;
}

describe("validate() middleware", () => {
  it("calls next() when there are no validation rules", async () => {
    const req = { body: {}, params: {}, query: {}, headers: {} } as import("express").Request;
    const res = makeMockRes();
    const next = vi.fn();

    await validate([])(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("calls next() when all validators pass", async () => {
    const req = { body: { email: "ok@example.com" }, params: {}, query: {}, headers: {} } as import("express").Request;
    const res = makeMockRes();
    const next = vi.fn();

    await validate([v.email()])(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 400 and does NOT call next() when a validator fails", async () => {
    const req = { body: { email: "bad-email" }, params: {}, query: {}, headers: {} } as import("express").Request;
    const res = makeMockRes();
    const next = vi.fn();

    await validate([v.email()])(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledTimes(1);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("details");
    expect(Array.isArray(body.details)).toBe(true);
    expect(body.details.length).toBeGreaterThan(0);
  });

  it("collects errors from multiple failing validators", async () => {
    const req = {
      body: { email: "bad", password: "short" },
      params: {},
      query: {},
      headers: {},
    } as import("express").Request;
    const res = makeMockRes();
    const next = vi.fn();

    await validate([v.email(), v.password()])(req, res, next);

    expect(next).not.toHaveBeenCalled();
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.details.length).toBeGreaterThanOrEqual(2);
  });
});
