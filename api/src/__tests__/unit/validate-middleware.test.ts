import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { validateZod } from "../../middleware/validate";

// ── helpers ───────────────────────────────────────────────────────────────────

function makeReq(body: Record<string, unknown>) {
  return { body, params: {}, query: {}, headers: {} } as import("express").Request;
}

function makeMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
  return res as unknown as import("express").Response & typeof res;
}

// ── validateZod() ─────────────────────────────────────────────────────────────

describe("validateZod() middleware", () => {
  const schema = z.object({
    email: z.string().email("Email inválido"),
    name: z.string().min(2, "Nome muito curto"),
  });

  it("calls next() when body matches the schema", () => {
    const req = makeReq({ email: "user@example.com", name: "João" });
    const res = makeMockRes();
    const next = vi.fn();

    validateZod(schema)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 400 and does NOT call next() when body fails validation", () => {
    const req = makeReq({ email: "not-an-email", name: "João" });
    const res = makeMockRes();
    const next = vi.fn();

    validateZod(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledTimes(1);
  });

  it("returns { error: 'Dados inválidos', details: [...] } on validation failure", () => {
    const req = makeReq({ email: "bad", name: "João" });
    const res = makeMockRes();
    const next = vi.fn();

    validateZod(schema)(req, res, next);

    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body).toHaveProperty("error", "Dados inválidos");
    expect(body).toHaveProperty("details");
    expect(Array.isArray(body.details)).toBe(true);
    expect(body.details.length).toBeGreaterThan(0);
  });

  it("details array contains field and message for each error", () => {
    const req = makeReq({ email: "bad", name: "x" });
    const res = makeMockRes();
    const next = vi.fn();

    validateZod(schema)(req, res, next);

    const { details } = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      details: Array<{ field: string; message: string }>;
    };

    expect(details.length).toBeGreaterThanOrEqual(2);
    for (const d of details) {
      expect(d).toHaveProperty("field");
      expect(d).toHaveProperty("message");
    }
  });

  it("reports the correct field name in details", () => {
    const req = makeReq({ email: "bad", name: "João" });
    const res = makeMockRes();
    const next = vi.fn();

    validateZod(schema)(req, res, next);

    const { details } = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      details: Array<{ field: string; message: string }>;
    };

    const emailError = details.find((d) => d.field === "email");
    expect(emailError).toBeDefined();
    expect(emailError!.message).toBe("Email inválido");
  });

  it("mutates req.body with parsed/coerced data when schema passes", () => {
    const trimSchema = z.object({ email: z.string().email() });
    const req = makeReq({ email: "user@example.com" });
    const res = makeMockRes();
    const next = vi.fn();

    validateZod(trimSchema)(req, res, next);

    // After successful validation req.body is replaced with zod output
    expect(req.body).toEqual({ email: "user@example.com" });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when required field is completely absent", () => {
    const req = makeReq({ name: "João" }); // missing email
    const res = makeMockRes();
    const next = vi.fn();

    validateZod(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 for empty body (all required fields missing)", () => {
    const req = makeReq({});
    const res = makeMockRes();
    const next = vi.fn();

    validateZod(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.details.length).toBeGreaterThanOrEqual(2);
  });

  it("calls next() when schema has only optional fields and body is empty", () => {
    const optSchema = z.object({ name: z.string().optional() });
    const req = makeReq({});
    const res = makeMockRes();
    const next = vi.fn();

    validateZod(optSchema)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
