import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  DB,
  getCookie,
  fmtDate,
  clearLegacySession,
  normalizeSessionUser,
  normDemand,
  normOrder,
  normProposal,
  normTxn,
  normContract,
  normDispute,
  normReview,
  normNotif,
  normNDA,
} from "./index";

// ─── DB ───────────────────────────────────────────────────────────────────────
describe("DB", () => {
  beforeEach(() => localStorage.clear());

  it("set e get roundtrip", () => {
    DB.set("test", { x: 1 });
    expect(DB.get("test")).toEqual({ x: 1 });
  });

  it("get retorna null para chave inexistente", () => {
    expect(DB.get("nope")).toBeNull();
  });

  it("del remove a chave", () => {
    DB.set("toDelete", 42);
    DB.del("toDelete");
    expect(DB.get("toDelete")).toBeNull();
  });

  it("usa prefixo cap4_", () => {
    DB.set("key", "val");
    expect(localStorage.getItem("cap4_key")).toBe('"val"');
  });
});

// ─── getCookie ────────────────────────────────────────────────────────────────
describe("getCookie", () => {
  beforeEach(() => {
    Object.defineProperty(document, "cookie", { writable: true, value: "" });
  });

  it("retorna valor do cookie existente", () => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "csrf_token=abc123; other=xyz",
    });
    expect(getCookie("csrf_token")).toBe("abc123");
  });

  it("retorna string vazia para cookie inexistente", () => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "other=xyz",
    });
    expect(getCookie("csrf_token")).toBe("");
  });
});

// ─── fmtDate ─────────────────────────────────────────────────────────────────
describe("fmtDate", () => {
  it("formata ISO string no padrão pt-BR", () => {
    const result = fmtDate("2026-05-18T00:00:00Z");
    expect(result).toMatch(/\d{2}\/05\/2026/);
  });

  it("retorna null para valor falsy", () => {
    expect(fmtDate(null)).toBeNull();
    expect(fmtDate(undefined)).toBeNull();
    expect(fmtDate("")).toBeNull();
  });
});

// ─── clearLegacySession ───────────────────────────────────────────────────────
describe("clearLegacySession", () => {
  beforeEach(() => localStorage.clear());

  it("remove cap4_jwt e cap4_session", () => {
    localStorage.setItem("cap4_jwt", "token");
    localStorage.setItem("cap4_session", '{"id":1}');
    clearLegacySession();
    expect(localStorage.getItem("cap4_jwt")).toBeNull();
    expect(localStorage.getItem("cap4_session")).toBeNull();
  });

  it("remove todas as chaves cap4_*", () => {
    localStorage.setItem("cap4_prefs", "{}");
    localStorage.setItem("cap4_theme", "dark");
    localStorage.setItem("other_key", "keep");
    clearLegacySession();
    expect(localStorage.getItem("cap4_prefs")).toBeNull();
    expect(localStorage.getItem("cap4_theme")).toBeNull();
    expect(localStorage.getItem("other_key")).toBe("keep");
  });
});

// ─── normalizeSessionUser ─────────────────────────────────────────────────────
describe("normalizeSessionUser", () => {
  it("retorna null para null", () => {
    expect(normalizeSessionUser(null)).toBeNull();
  });

  it("normaliza company_status → companyStatus", () => {
    const user = normalizeSessionUser({ company_status: "active", companyId: "c1" });
    expect(user.companyStatus).toBe("active");
    expect(user.company_id).toBe("c1");
  });

  it("preserva companyStatus se já presente", () => {
    const user = normalizeSessionUser({ companyStatus: "verified", company_id: "c2" });
    expect(user.companyStatus).toBe("verified");
    expect(user.company_id).toBe("c2");
  });

  it("adiciona loginAt se ausente", () => {
    const user = normalizeSessionUser({ id: 1 });
    expect(user.loginAt).toBeTruthy();
    expect(new Date(user.loginAt).getFullYear()).toBeGreaterThanOrEqual(2026);
  });
});

// ─── Normalizers ─────────────────────────────────────────────────────────────
describe("normDemand", () => {
  it("mapeia proposals_count → proposals", () => {
    expect(normDemand({ proposals_count: 3 }).proposals).toBe(3);
  });

  it("mapeia nda_required → nda", () => {
    expect(normDemand({ nda_required: true }).nda).toBe(true);
  });

  it("formata created_at", () => {
    const d = normDemand({ created_at: "2026-01-01T00:00:00Z" });
    expect(d.created).toMatch(/\d{2}\/01\/2026/);
  });
});

describe("normOrder", () => {
  it("mapeia supplier_company_name → supplier", () => {
    expect(normOrder({ supplier_company_name: "Acme" }).supplier).toBe("Acme");
  });

  it("formata value a partir de value_raw", () => {
    const o = normOrder({ value_raw: "5000" });
    expect(o.value).toContain("5");
    expect(o.gross).toBe(5000);
  });

  it("usa fallback — quando sem supplier", () => {
    expect(normOrder({}).supplier).toBe("—");
  });
});

describe("normProposal", () => {
  it("mapeia unit_price → unit", () => {
    expect(normProposal({ unit_price: 99 }).unit).toBe(99);
  });

  it("riskFactors padrão é array vazio", () => {
    expect(normProposal({}).riskFactors).toEqual([]);
  });
});

describe("normTxn", () => {
  it("converte gross para número", () => {
    expect(normTxn({ gross: "100.5" }).gross).toBe(100.5);
  });

  it("mapeia order_id → order", () => {
    expect(normTxn({ order_id: "o1" }).order).toBe("o1");
  });
});

describe("normContract", () => {
  it("mapeia order_id → pedido", () => {
    expect(normContract({ order_id: "o2" }).pedido).toBe("o2");
  });

  it("formata generated_at", () => {
    const c = normContract({ generated_at: "2026-03-10T00:00:00Z" });
    expect(c.gerado).toMatch(/\d{2}\/03\/2026/);
  });
});

describe("normDispute", () => {
  it("mapeia description → desc", () => {
    expect(normDispute({ description: "Issue" }).desc).toBe("Issue");
  });
});

describe("normReview", () => {
  it("mapeia from_company → from", () => {
    expect(normReview({ from_company: "Supplier X" }).from).toBe("Supplier X");
  });
});

describe("normNotif", () => {
  it("mapeia descricao → desc", () => {
    expect(normNotif({ descricao: "Nova notificação" }).desc).toBe("Nova notificação");
  });

  it("usa read para lida quando definido", () => {
    expect(normNotif({ read: false }).lida).toBe(false);
  });

  it("usa lida quando read é undefined", () => {
    expect(normNotif({ lida: true }).lida).toBe(true);
  });
});

describe("normNDA", () => {
  it("mapeia demand_id → demanda", () => {
    expect(normNDA({ demand_id: "d1" }).demanda).toBe("d1");
  });

  it("formata signed_at em ISO para data pt-BR", () => {
    const n = normNDA({ signed_at: "2026-02-14T00:00:00Z" });
    expect(n.assinado).toMatch(/\d{2}\/02\/2026/);
  });

  it("preserva signed_at já no formato pt-BR", () => {
    const n = normNDA({ signed_at: "14/02/2026" });
    expect(n.assinado).toBe("14/02/2026");
  });
});
