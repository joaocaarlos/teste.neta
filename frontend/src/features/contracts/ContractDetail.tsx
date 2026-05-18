import React from "react";
import { useContract, useSignContract, useCancelContract } from "./useContracts";
import { useStore } from "../../store";
import type { ContractStatus } from "../../types";

interface ContractDetailProps {
  contractId: string;
  onBack?: () => void;
  onStatusChange?: () => void;
}

const STATUS_STYLES: Record<ContractStatus, string> = {
  Gerado: "bg-gray-100 text-gray-700",
  "Aguardando assinatura": "bg-yellow-100 text-yellow-800",
  Assinado: "bg-green-100 text-green-800",
  Cancelado: "bg-red-100 text-red-700",
};

export const ContractDetail: React.FC<ContractDetailProps> = ({
  contractId,
  onBack,
  onStatusChange,
}) => {
  const { data: contract, loading, error, refetch } = useContract(contractId);
  const { mutate: sign, loading: signing } = useSignContract(contractId);
  const { mutate: cancel, loading: cancelling } = useCancelContract(contractId);
  const { toastSuccess, toastError } = useStore();

  const handleSign = async () => {
    try {
      await sign();
      toastSuccess("Contrato assinado!", "O contrato foi assinado com sucesso.");
      refetch();
      onStatusChange?.();
    } catch (err) {
      toastError("Erro ao assinar", (err as Error).message);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Tem certeza que deseja cancelar este contrato?")) return;
    try {
      await cancel();
      toastSuccess("Contrato cancelado.", "O contrato foi cancelado.");
      refetch();
      onStatusChange?.();
    } catch (err) {
      toastError("Erro ao cancelar", (err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="rounded-2xl bg-red-50 p-5 text-sm text-red-600">
        {error ? error.message : "Contrato não encontrado."}
      </div>
    );
  }

  const statusClass =
    STATUS_STYLES[contract.status as ContractStatus] ?? "bg-gray-100 text-gray-700";

  const canSign = contract.status === "Aguardando assinatura";
  const canCancel =
    contract.status === "Gerado" || contract.status === "Aguardando assinatura";

  return (
    <div className="space-y-5">
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          ← Voltar
        </button>
      )}

      {/* Header card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Contrato
            </p>
            <h2 className="mt-0.5 text-xl font-bold text-gray-900">
              {contract.id}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Pedido: {contract.order_id}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${statusClass}`}
          >
            {contract.status}
          </span>
        </div>

        {/* Meta */}
        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Criado em</dt>
            <dd className="font-medium text-gray-900">
              {contract.created_at ? new Date(contract.created_at).toLocaleDateString("pt-BR") : "—"}
            </dd>
          </div>
          {contract.signed_at && (
            <div>
              <dt className="text-gray-500">Assinado em</dt>
              <dd className="font-medium text-gray-900">
                {new Date(contract.signed_at).toLocaleDateString("pt-BR")}
              </dd>
            </div>
          )}
        </dl>

        {/* PDF link */}
        {contract.pdf_url && (
          <a
            href={contract.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Visualizar PDF
          </a>
        )}
      </div>

      {/* Action buttons */}
      {(canSign || canCancel) && (
        <div className="flex gap-3">
          {canSign && (
            <button
              onClick={handleSign}
              disabled={signing}
              className="flex-1 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {signing ? "Assinando..." : "Assinar Contrato"}
            </button>
          )}
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex-1 rounded-xl border border-red-300 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {cancelling ? "Cancelando..." : "Cancelar Contrato"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ContractDetail;
