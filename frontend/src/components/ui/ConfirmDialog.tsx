import { useEffect, useRef, type ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  variant?: "default" | "danger";
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * ConfirmDialog — modal de confirmação acessível para ações irreversíveis.
 * - Focus trap simples (foca no botão de cancelar ao abrir)
 * - Esc fecha
 * - Click no overlay fecha
 * - role="alertdialog" para SR
 *
 * @example
 * const [open, setOpen] = useState(false);
 * <Btn onClick={() => setOpen(true)}>Cancelar pedido</Btn>
 * <ConfirmDialog
 *   open={open}
 *   variant="danger"
 *   title="Cancelar este pedido?"
 *   message="Esta ação é irreversível. O fornecedor será notificado."
 *   confirmLabel="Sim, cancelar"
 *   onConfirm={() => { doCancel(); setOpen(false); }}
 *   onCancel={() => setOpen(false)}
 * />
 */
export function ConfirmDialog({
  open,
  title,
  message,
  variant = "default",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    // Focus no botão de cancelar (mais seguro)
    cancelBtnRef.current?.focus();

    // Trap Esc
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);

    // Bloqueia scroll do body
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = orig;
    };
  }, [open, onCancel]);

  if (!open) return null;

  const isDanger = variant === "danger";

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        style={{
          background: "var(--bg2)",
          border: "1px solid var(--border2)",
          maxWidth: 440,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          padding: 28,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flex: 1 }}>
            {isDanger && (
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "rgba(239,68,68,0.1)",
                  color: "var(--red)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                <AlertTriangle size={22} />
              </div>
            )}
            <div
              id="confirm-title"
              style={{
                fontFamily: "var(--cond)",
                fontSize: 20,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: ".04em",
                color: "var(--white)",
              }}
            >
              {title}
            </div>
          </div>
          <button
            onClick={onCancel}
            aria-label="Fechar"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--white3)",
              cursor: "pointer",
              padding: 4,
              display: "flex",
            }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div
          id="confirm-message"
          style={{
            fontFamily: "var(--body)",
            fontSize: 14,
            color: "var(--white2)",
            lineHeight: 1.6,
          }}
        >
          {message}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            ref={cancelBtnRef}
            onClick={onCancel}
            style={{
              padding: "10px 18px",
              background: "transparent",
              color: "var(--white)",
              border: "1px solid var(--border2)",
              fontFamily: "var(--cond)",
              fontWeight: 700,
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: ".08em",
              cursor: "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "10px 18px",
              background: isDanger ? "var(--red)" : "var(--amber)",
              color: isDanger ? "var(--white)" : "var(--bg)",
              border: "none",
              fontFamily: "var(--cond)",
              fontWeight: 700,
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: ".08em",
              cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
