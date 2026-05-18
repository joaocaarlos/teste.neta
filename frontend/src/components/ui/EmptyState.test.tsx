import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "./EmptyState";

describe("<EmptyState />", () => {
  it("renderiza título", () => {
    render(<EmptyState title="Nenhuma demanda ainda" />);
    expect(screen.getByText("Nenhuma demanda ainda")).toBeInTheDocument();
  });

  it("renderiza mensagem opcional", () => {
    render(<EmptyState title="Vazio" message="Crie sua primeira" />);
    expect(screen.getByText("Crie sua primeira")).toBeInTheDocument();
  });

  it("tem role=status para acessibilidade", () => {
    render(<EmptyState title="Vazio" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("aria-live=polite", () => {
    render(<EmptyState title="Vazio" />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("dispara onClick da action quando clicado", async () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="Vazio"
        action={{ label: "Criar demanda", onClick }}
      />
    );
    const btn = screen.getByRole("button", { name: /criar demanda/i });
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("não renderiza botão sem action", () => {
    render(<EmptyState title="Vazio" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
