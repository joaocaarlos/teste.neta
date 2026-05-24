import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./ConfirmDialog";

describe("<ConfirmDialog />", () => {
  it("não renderiza quando open=false", () => {
    render(
      <ConfirmDialog
        open={false}
        title="Excluir?"
        message="Tem certeza?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("renderiza quando open=true com role=alertdialog", () => {
    render(
      <ConfirmDialog
        open
        title="Excluir?"
        message="Tem certeza?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("renderiza título e mensagem", () => {
    render(
      <ConfirmDialog
        open
        title="Cancelar pedido?"
        message="Isto é irreversível."
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText("Cancelar pedido?")).toBeInTheDocument();
    expect(screen.getByText("Isto é irreversível.")).toBeInTheDocument();
  });

  it("chama onCancel ao clicar em Cancelar", async () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="X"
        message="Y"
        onConfirm={() => {}}
        onCancel={onCancel}
        cancelLabel="Cancelar"
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("chama onConfirm ao clicar em Confirmar", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        title="X"
        message="Y"
        onConfirm={onConfirm}
        onCancel={() => {}}
        confirmLabel="Confirmar"
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /^confirmar$/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("Esc fecha (chama onCancel)", async () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="X"
        message="Y"
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    );
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalled();
  });

  it("variant=danger usa label customizado", () => {
    render(
      <ConfirmDialog
        open
        variant="danger"
        title="Apagar conta"
        message="Irreversível"
        confirmLabel="Sim, apagar"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: /sim, apagar/i })).toBeInTheDocument();
  });
});
