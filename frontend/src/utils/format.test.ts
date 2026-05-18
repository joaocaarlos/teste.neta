import { describe, expect, it } from "vitest";
import {
  formatCurrencyBRL,
  formatNumber,
  formatDate,
  formatDateTime,
  formatRelative,
  formatBytes,
  truncate,
  initials,
  maskCNPJ,
  formatPercent,
} from "./format";

describe("formatCurrencyBRL", () => {
  it("formata número como R$", () => {
    expect(formatCurrencyBRL(1234.56)).toMatch(/R\$\s*1\.234,56/);
  });
  it("aceita string numérica", () => {
    expect(formatCurrencyBRL("1234.56")).toMatch(/R\$\s*1\.234,56/);
  });
  it("zero", () => {
    expect(formatCurrencyBRL(0)).toMatch(/R\$\s*0,00/);
  });
  it("null/undefined retorna —", () => {
    expect(formatCurrencyBRL(null)).toBe("—");
    expect(formatCurrencyBRL(undefined)).toBe("—");
  });
  it("NaN retorna —", () => {
    expect(formatCurrencyBRL("abc")).toBe("—");
  });
});

describe("formatNumber", () => {
  it("formata com 2 casas por default", () => {
    expect(formatNumber(1234.5678)).toBe("1.234,57");
  });
  it("respeita fractionDigits", () => {
    expect(formatNumber(1234, 0)).toBe("1.234");
  });
  it("null retorna —", () => {
    expect(formatNumber(null)).toBe("—");
  });
});

describe("formatDate", () => {
  it("formata Date como dd/MM/yyyy", () => {
    const d = new Date("2026-05-11T12:00:00Z");
    expect(formatDate(d)).toMatch(/\d{2}\/05\/2026/);
  });
  it("aceita ISO string", () => {
    expect(formatDate("2026-05-11")).toMatch(/\d{2}\/05\/2026/);
  });
  it("null retorna —", () => {
    expect(formatDate(null)).toBe("—");
  });
  it("data inválida retorna —", () => {
    expect(formatDate("not-a-date")).toBe("—");
  });
});

describe("formatDateTime", () => {
  it("inclui 'às' entre data e hora", () => {
    expect(formatDateTime("2026-05-11T14:30:00")).toMatch(/\d{2}\/05\/2026.*às.*\d{2}:\d{2}/);
  });
});

describe("formatRelative", () => {
  const now = new Date("2026-05-11T12:00:00Z");

  it("retorna 'agora' para diff < 45s", () => {
    expect(formatRelative(new Date("2026-05-11T11:59:30Z"), now)).toBe("agora");
  });
  it("usa minutos para < 1h", () => {
    const r = formatRelative(new Date("2026-05-11T11:30:00Z"), now);
    expect(r).toMatch(/min|minuto/i);
  });
  it("usa horas para < 24h", () => {
    const r = formatRelative(new Date("2026-05-11T08:00:00Z"), now);
    expect(r).toMatch(/h|hora/i);
  });
});

describe("formatBytes", () => {
  it("0 B", () => expect(formatBytes(0)).toBe("0 B"));
  it("KB", () => expect(formatBytes(1024)).toMatch(/^1(\.0)?\s*KB$/));
  it("MB", () => expect(formatBytes(5 * 1024 * 1024)).toMatch(/^5(\.0)?\s*MB$/));
  it("null", () => expect(formatBytes(null)).toBe("—"));
});

describe("truncate", () => {
  it("não trunca strings curtas", () => {
    expect(truncate("Olá", 10)).toBe("Olá");
  });
  it("trunca com reticências", () => {
    expect(truncate("Lorem ipsum dolor sit amet", 10)).toMatch(/…$/);
    expect(truncate("Lorem ipsum dolor sit amet", 10).length).toBeLessThanOrEqual(10);
  });
  it("aceita null", () => {
    expect(truncate(null)).toBe("");
  });
});

describe("initials", () => {
  it("João Silva → JS", () => expect(initials("João Silva")).toBe("JS"));
  it("Maria → M", () => expect(initials("Maria")).toBe("M"));
  it("3 nomes → 2 iniciais por default", () =>
    expect(initials("Ana Maria Silva")).toBe("AM"));
  it("max=3 captura 3 iniciais", () =>
    expect(initials("Ana Maria Silva", 3)).toBe("AMS"));
  it("null → ?", () => expect(initials(null)).toBe("?"));
});

describe("maskCNPJ", () => {
  it("mascara meio do CNPJ", () => {
    expect(maskCNPJ("12345678000190")).toBe("12.345.***/****-90");
  });
  it("CNPJ inválido retorna original", () => {
    expect(maskCNPJ("123")).toBe("123");
  });
  it("null retorna —", () => {
    expect(maskCNPJ(null)).toBe("—");
  });
});

describe("formatPercent", () => {
  it("0.05 → 5,0%", () => expect(formatPercent(0.05)).toBe("5,0%"));
  it("0.123 → 12,3%", () => expect(formatPercent(0.123)).toBe("12,3%"));
  it("0.1234, 2 → 12,34%", () => expect(formatPercent(0.1234, 2)).toBe("12,34%"));
  it("null → —", () => expect(formatPercent(null)).toBe("—"));
});
