import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
}

/**
 * EmptyState — usado quando uma lista está vazia.
 * Padronização visual com ícone, título, mensagem e CTA opcional.
 *
 * @example
 * <EmptyState
 *   icon={<Package size={48} />}
 *   title="Nenhum pedido ainda"
 *   message="Quando uma proposta for aceita, o pedido aparece aqui."
 *   action={{ label: "Ver demandas", onClick: () => navigate('/demands') }}
 * />
 */
export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 32px",
        textAlign: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: "50%",
          background: "var(--bg3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--white3)",
        }}
        aria-hidden="true"
      >
        {icon || <Inbox size={48} />}
      </div>

      <div
        style={{
          fontFamily: "var(--cond)",
          fontSize: 20,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: ".04em",
          color: "var(--white)",
        }}
      >
        {title}
      </div>

      {message && (
        <div
          style={{
            fontFamily: "var(--body)",
            fontSize: 13,
            color: "var(--white2)",
            maxWidth: 380,
            lineHeight: 1.5,
          }}
        >
          {message}
        </div>
      )}

      {action && (
        <button
          onClick={action.onClick}
          style={{
            marginTop: 12,
            padding: "10px 20px",
            background: "var(--amber)",
            color: "var(--bg)",
            border: "none",
            fontFamily: "var(--cond)",
            fontWeight: 700,
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: ".08em",
            cursor: "pointer",
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
