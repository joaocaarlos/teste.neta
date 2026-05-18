import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch, apiGet, apiGetList } from "./api";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function mockFetch(body: unknown, status = 200) {
  const res = {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(res));
  return res;
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Object.defineProperty(document, "cookie", { writable: true, value: "" });
});

// ─── apiFetch ────────────────────────────────────────────────────────────────
describe("apiFetch", () => {
  it("faz GET com credentials:include", async () => {
    mockFetch({ ok: true });
    await apiFetch("/test");
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe("/api/test");
    expect(call[1].credentials).toBe("include");
  });

  it("inclui Content-Type application/json para JSON body", async () => {
    mockFetch({});
    await apiFetch("/test", { method: "POST", body: JSON.stringify({ x: 1 }) });
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].headers["Content-Type"]).toBe("application/json");
  });

  it("não inclui Content-Type para FormData", async () => {
    mockFetch({});
    await apiFetch("/test", { method: "POST", body: new FormData() });
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].headers["Content-Type"]).toBeUndefined();
  });

  it("inclui X-CSRF-Token para métodos unsafe quando cookie presente", async () => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "csrf_token=tok123",
    });
    mockFetch({});
    await apiFetch("/test", { method: "POST", body: "{}" });
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].headers["X-CSRF-Token"]).toBe("tok123");
  });

  it("retorna Response sem lançar em erro 4xx", async () => {
    mockFetch({ error: "not found" }, 404);
    const res = await apiFetch("/missing");
    expect(res.status).toBe(404);
  });
});

// ─── apiGet ───────────────────────────────────────────────────────────────────
describe("apiGet", () => {
  it("retorna { ok: true, data } em sucesso", async () => {
    mockFetch({ data: [1, 2, 3] });
    const result = await apiGet("/list");
    expect(result).toEqual({ ok: true, data: [1, 2, 3] });
  });

  it("usa json raiz quando sem .data", async () => {
    mockFetch([4, 5, 6]);
    const result = await apiGet("/list");
    expect(result).toEqual({ ok: true, data: [4, 5, 6] });
  });

  it("retorna { ok: false } em erro HTTP", async () => {
    mockFetch({ error: "Forbidden" }, 403);
    const result = await apiGet("/protected");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.error).toBe("Forbidden");
    }
  });

  it("retorna { ok: false } em erro de rede", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network down")));
    const result = await apiGet("/anywhere");
    expect(result.ok).toBe(false);
  });
});

// ─── apiGetList ───────────────────────────────────────────────────────────────
describe("apiGetList", () => {
  it("retorna array em sucesso", async () => {
    mockFetch({ data: ["a", "b"] });
    const list = await apiGetList("/items");
    expect(list).toEqual(["a", "b"]);
  });

  it("retorna [] em falha sem lançar", async () => {
    mockFetch({ error: "err" }, 500);
    const list = await apiGetList("/broken");
    expect(list).toEqual([]);
  });

  it("retorna [] se data não for array", async () => {
    mockFetch({ data: { key: "val" } });
    const list = await apiGetList("/object");
    expect(list).toEqual([]);
  });
});
