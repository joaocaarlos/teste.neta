import { describe, expect, it } from "vitest";
import { isValidCNPJ, formatCNPJ, formatCEP, formatPhone, BR_STATES, PROCESS_CATEGORIES, CERTIFICATIONS } from "./industry-constants";

describe("isValidCNPJ", () => {
  it("aceita CNPJ válido", () => {
    expect(isValidCNPJ("11.222.333/0001-81")).toBe(true);
    expect(isValidCNPJ("11222333000181")).toBe(true);
  });
  it("rejeita CNPJ inválido", () => {
    expect(isValidCNPJ("11.222.333/0001-99")).toBe(false);
  });
  it("rejeita CNPJ curto", () => {
    expect(isValidCNPJ("123")).toBe(false);
  });
  it("rejeita todos dígitos iguais", () => {
    expect(isValidCNPJ("11111111111111")).toBe(false);
  });
});

describe("formatCNPJ", () => {
  it("aplica máscara progressiva", () => {
    expect(formatCNPJ("12345678000190")).toBe("12.345.678/0001-90");
  });
  it("string vazia retorna vazio", () => {
    expect(formatCNPJ("")).toBe("");
  });
  it("trunca em 14 dígitos", () => {
    expect(formatCNPJ("12345678000190EXTRA")).toBe("12.345.678/0001-90");
  });
});

describe("formatCEP", () => {
  it("aplica máscara 00000-000", () => {
    expect(formatCEP("01310100")).toBe("01310-100");
  });
});

describe("formatPhone", () => {
  it("celular 11 dígitos: (11) 99999-9999", () => {
    expect(formatPhone("11999998888")).toBe("(11) 99999-8888");
  });
  it("fixo 10 dígitos: (11) 3333-4444", () => {
    expect(formatPhone("1133334444")).toBe("(11) 3333-4444");
  });
});

describe("BR_STATES", () => {
  it("tem 27 estados", () => {
    expect(BR_STATES).toHaveLength(27);
  });
  it("todos têm UF de 2 caracteres", () => {
    BR_STATES.forEach((s) => expect(s.uf).toHaveLength(2));
  });
  it("São Paulo na lista", () => {
    expect(BR_STATES.find((s) => s.uf === "SP")?.name).toBe("São Paulo");
  });
});

describe("PROCESS_CATEGORIES", () => {
  it("inclui categorias industriais essenciais", () => {
    const values = PROCESS_CATEGORIES.map((c) => c.value);
    expect(values).toContain("usinagem");
    expect(values).toContain("injecao");
    expect(values).toContain("soldagem");
  });
  it("usinagem tem sub-processos", () => {
    const usinagem = PROCESS_CATEGORIES.find((c) => c.value === "usinagem");
    expect(usinagem?.sub.length).toBeGreaterThan(0);
  });
});

describe("CERTIFICATIONS", () => {
  it("inclui ISO 9001 e IATF 16949", () => {
    const values = CERTIFICATIONS.map((c) => c.value);
    expect(values).toContain("iso_9001");
    expect(values).toContain("iatf_16949");
  });
});
