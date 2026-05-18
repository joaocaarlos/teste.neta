import React from "react";
import type { Proposal } from "../../types";
import { useStore } from "../../store";
import { useProposalActions } from "./useProposals";

interface ProposalCardProps {
  proposal: Proposal;
  /** Whether the current user is the buyer (can accept/reject) */
  isBuyer?: boolean;
  /** Whether the current user is the supplier (can withdraw) */
  isSupplier?: boolean;
  onAccepted?: (proposal: Proposal) => void;
  onWithdrawn?: (proposal: Proposal) => void;
}

const STATUS_COLORS: Record<string, string> = {
  Enviada: "bg-blue-100 text-blue-800",
  "Em análise": "bg-yellow-100 text-yellow-800",
  Aceita: "bg-green-100 text-green-800",
  Recusada: "bg-red-100 text-red-800",
  Retirada: "bg-gray-100 text-gray-700",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export const ProposalCard: React.FC<ProposalCardProps> = ({
  proposal,
  isBuyer = false,
  isSupplier = false,
  onAccepted,
  onWithdrawn,
}) => {
  const { toastSuccess, toastError } = useStore();
  const { accept, acceptLoading, withdraw, withdrawLoading } =
    useProposalActions(proposal.id);

  const canAccept =
    isBuyer &&
    (proposal.status === "Enviada" || proposal.status === "Em análise");
  const canWithdraw =
    isSupplier &&
    (proposal.status === "Enviada" || proposal.status === "Em análise");

  const handleAccept = async () => {
    try {
      await accept();
      toastSuccess("Proposta aceita!", "Um pedido foi criado automaticamente.");
      onAccepted?.(proposal);
    } catch (err) {
      toastError("Erro ao aceitar proposta", (err as Error).message);
    }
  };

  const handleWithdraw = async () => {
    try {
      await withdraw();
      toastSuccess("Proposta retirada.", "A proposta foi retirada com sucesso.");
      onWithdrawn?.(proposal);
    } catch (err) {
      toastError("Erro ao retirar proposta", (err as Error).message);
    }
  };

  const status = proposal.status ?? "Enviada";
  const statusClass =
    (STATUS_COLORS as Record<string, string>)[status] ?? "bg-gray-100 text-gray-700";
  const company =
    typeof proposal.company === "object" ? proposal.company : null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {company?.name ?? proposal.supplier ?? "Fornecedor"}
          </p>
          {company?.rating !== undefined && (
            <p className="text-xs text-yellow-500">
              {"★".repeat(Math.round(company.rating))}
              <span className="ml-1 text-gray-500">
                ({company.rating.toFixed(1)})
              </span>
            </p>
          )}
        </div>

        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}`}
        >
          {status}
        </span>
      </div>

      {/* Key metrics */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-gray-50 p-2">
          <p className="text-xs text-gray-500">Valor</p>
          <p className="mt-0.5 text-sm font-bold text-gray-900">
            {formatCurrency(proposal.price ?? 0)}
          </p>
        </div>
        <div className="rounded-xl bg-gray-50 p-2">
          <p className="text-xs text-gray-500">Prazo</p>
          <p className="mt-0.5 text-sm font-bold text-gray-900">
            {proposal.lead_time_days}d
          </p>
        </div>
        {proposal.score !== undefined && proposal.score !== null && (
          <div className="rounded-xl bg-gray-50 p-2">
            <p className="text-xs text-gray-500">Score</p>
            <p className="mt-0.5 text-sm font-bold text-indigo-600">
              {proposal.score}/100
            </p>
          </div>
        )}
      </div>

      {/* Notes */}
      {proposal.notes && (
        <p className="mt-3 text-xs text-gray-600 line-clamp-2">
          {proposal.notes}
        </p>
      )}

      {/* Date */}
      <p className="mt-2 text-xs text-gray-400">
        Enviada em{" "}
        {proposal.created_at ? new Date(proposal.created_at).toLocaleDateString("pt-BR") : "—"}
      </p>

      {/* Actions */}
      {(canAccept || canWithdraw) && (
        <div className="mt-4 flex gap-2">
          {canAccept && (
            <button
              onClick={handleAccept}
              disabled={acceptLoading}
              className="flex-1 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {acceptLoading ? "Aceitando..." : "Aceitar"}
            </button>
          )}
          {canWithdraw && (
            <button
              onClick={handleWithdraw}
              disabled={withdrawLoading}
              className="flex-1 rounded-xl border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {withdrawLoading ? "Retirando..." : "Retirar"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProposalCard;
