import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge, statusVariant } from "./Badge";

describe("<Badge />", () => {
  it("renderiza children", () => {
    render(<Badge>Aprovado</Badge>);
    expect(screen.getByText("Aprovado")).toBeInTheDocument();
  });

  it("aplica variant green para success", () => {
    const { container } = render(<Badge variant="green">OK</Badge>);
    const span = container.querySelector("span") as HTMLElement;
    // jsdom converte var(--green) em valor literal — checa que o estilo foi aplicado
    expect(span.style.color).toMatch(/var\(--green\)|22C55E/i);
  });

  it("aplica variant red para erro", () => {
    const { container } = render(<Badge variant="red">Erro</Badge>);
    const span = container.querySelector("span") as HTMLElement;
    expect(span.style.color).toMatch(/var\(--red\)|EF4444/i);
  });

  it("tamanho small reduz fonte", () => {
    const { container } = render(<Badge size="sm">small</Badge>);
    const span = container.querySelector("span");
    expect(span?.getAttribute("style")).toMatch(/font-size:\s*9/i);
  });
});

describe("statusVariant()", () => {
  it("mapeia Aprovado → green", () => {
    expect(statusVariant("Aprovado")).toBe("green");
    expect(statusVariant("Liberado")).toBe("green");
    expect(statusVariant("Entregue")).toBe("green");
    expect(statusVariant("Finalizado")).toBe("green");
  });

  it("mapeia Cancelado/Reprovado → red", () => {
    expect(statusVariant("Cancelado")).toBe("red");
    expect(statusVariant("Reprovado")).toBe("red");
    expect(statusVariant("Suspenso")).toBe("red");
  });

  it("mapeia Pendente → amber", () => {
    expect(statusVariant("Pendente")).toBe("amber");
    expect(statusVariant("Em cotação")).toBe("amber");
  });

  it("status desconhecido → neutral", () => {
    expect(statusVariant("Estado Inexistente XYZ")).toBe("neutral");
  });

  it("aceita string vazia sem crashar", () => {
    expect(statusVariant("")).toBe("neutral");
  });

  it("é case-insensitive", () => {
    expect(statusVariant("APROVADO")).toBe("green");
    expect(statusVariant("aprovado")).toBe("green");
  });
});
