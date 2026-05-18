import React from "react";
import type { Dispute, DisputeStatus } from "../../types";
import { useDisputes, type UseDisputesOptions } from "./useDisputes";

const STATUS_STYLES: Record<DisputeStatus, string> = {
  Aberta: "bg-yellow-100 text-yellow-800",
  "Em análise": "bg-blue-100 text-blue-700",
  Resolvida: "bg-green-100 text-green-800",
  Encerrada: "bg-gray-100 text-gray-600",
};

interface DisputeListProps extends UseDisputesOptions {
  onSelectDispute?: (dispute: Dispute) => void;
}

function DisputeRow({
  dispute,
  onClick,
}: {
  dispute: Dispute;
  onClick?: () => void;
}) {
  const statusClass =
    STATUS_STYLES[dispute.status as DisputeStatus] ?? "bg-gray-100 text-gray-600";

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-gray-200 bg-white p-4 ${
        onClick ? "cursor-pointer hover:border-indigo-300 hover:shadow-sm" : ""
      } transition-all`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">
            {dispute.id}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            Pedido: {dispute.order_id}
          </p>
        </div>
        <span
          className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}`}
        >
          {dispute.status}
        </span>
      </div>

      <p className="mt-2 text-sm text-gray-600 line-clamp-2">{dispute.reason}</p>

      {dispute.resolution && (
        <p className="mt-1 text-xs text-green-700 line-clamp-1">
          Resolução: {dispute.resolution}
        </p>
      )}

      <p className="mt-2 text-xs text-gray-400">
        Aberta em {dispute.created_at ? new Date(dispute.created_at).toLocaleDateString("pt-BR") : "—"}
      </p>
    </div>
  );
}

export const DisputeList: React.FC<DisputeListProps> = ({
  onSelectDispute,
  ...options
}) => {
  const { disputes, loading, error, refetch } = useDisputes(options);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 p-5 text-center text-sm text-red-600">
        {error.message}
        <button onClick={refetch} className="ml-2 underline">
          Recarregar
        </button>
      </div>
    );
  }

  if (disputes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">
        Nenhuma disputa encontrada.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {disputes.map((d) => (
        <DisputeRow
          key={d.id}
          dispute={d}
          onClick={onSelectDispute ? () => onSelectDispute(d) : undefined}
        />
      ))}
    </div>
  );
};

export default DisputeList;
