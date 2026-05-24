import { describe, it, expect, vi, beforeEach } from "vitest";
import { ok, fail, ApiResponse, PaginatedResponse } from "../../lib/response";

function makeMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
  return res as unknown as import("express").Response & typeof res;
}

describe("ok()", () => {
  let res: ReturnType<typeof makeMockRes>;
  beforeEach(() => {
    res = makeMockRes();
  });

  it("sends status 200 by default", () => {
    ok(res, { id: 1 });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("calls json with data wrapped in ApiResponse shape", () => {
    ok(res, { id: 1 });
    expect(res.json).toHaveBeenCalledTimes(1);
    const arg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as ApiResponse<{ id: number }>;
    const json = arg.toJSON();
    expect(json.data).toEqual({ id: 1 });
    expect(typeof json.timestamp).toBe("string");
  });

  it("includes message when provided", () => {
    ok(res, { id: 2 }, "created");
    const arg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as ApiResponse<{ id: number }>;
    expect(arg.toJSON().message).toBe("created");
  });

  it("uses a custom status code when provided", () => {
    ok(res, {}, "created", 201);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("timestamp is a valid ISO string", () => {
    ok(res, null);
    const arg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as ApiResponse<null>;
    expect(() => new Date(arg.toJSON().timestamp)).not.toThrow();
    expect(new Date(arg.toJSON().timestamp).toISOString()).toBe(arg.toJSON().timestamp);
  });
});

describe("fail()", () => {
  let res: ReturnType<typeof makeMockRes>;
  beforeEach(() => {
    res = makeMockRes();
  });

  it("sends the provided status code", () => {
    fail(res, "Not found", "NOT_FOUND", 404);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("json body contains error and code", () => {
    fail(res, "Not found", "NOT_FOUND", 404);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.error).toBe("Not found");
    expect(body.code).toBe("NOT_FOUND");
  });

  it("json body contains timestamp as ISO string", () => {
    fail(res, "err", "ERR", 400);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(typeof body.timestamp).toBe("string");
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  it("includes detail when provided", () => {
    fail(res, "err", "ERR", 400, { field: "x" });
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.detail).toEqual({ field: "x" });
  });

  it("omits detail key when not provided", () => {
    fail(res, "err", "ERR", 400);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body).not.toHaveProperty("detail");
  });

  it("defaults to status 400 when not specified", () => {
    fail(res, "bad", "BAD");
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("defaults code to ERROR when not specified", () => {
    (fail as (...args: unknown[]) => void)(res, "oops");
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.code).toBe("ERROR");
  });
});

describe("ApiResponse", () => {
  it("toJSON returns data, message and timestamp", () => {
    const r = new ApiResponse({ x: 1 }, "ok");
    const j = r.toJSON();
    expect(j.data).toEqual({ x: 1 });
    expect(j.message).toBe("ok");
    expect(typeof j.timestamp).toBe("string");
  });

  it("message is undefined when not provided", () => {
    const r = new ApiResponse(42);
    expect(r.toJSON().message).toBeUndefined();
  });
});

describe("PaginatedResponse", () => {
  it("toJSON includes pagination metadata", () => {
    const r = new PaginatedResponse([1, 2, 3], 10, 3, 0);
    const j = r.toJSON();
    expect(j.data).toEqual([1, 2, 3]);
    expect(j.pagination.total).toBe(10);
    expect(j.pagination.limit).toBe(3);
    expect(j.pagination.offset).toBe(0);
  });

  it("hasMore is true when there are more items", () => {
    const r = new PaginatedResponse([], 10, 5, 0);
    expect(r.toJSON().pagination.hasMore).toBe(true);
  });

  it("hasMore is false when on last page", () => {
    const r = new PaginatedResponse([], 10, 5, 5);
    expect(r.toJSON().pagination.hasMore).toBe(false);
  });
});
