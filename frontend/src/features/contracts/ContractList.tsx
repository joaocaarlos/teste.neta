import React from "react";
import type { Contract, ContractStatus } from "../../types";
import { useContracts, type UseContractsOptions } from "./useContracts";

const STATUS_STYLES: Record<ContractStatus, string> = {
  Gerado: "bg-gray-100 text-gray-700",
  "Aguardando assinatura": "bg-yellow-100 text-yellow-800",
  Assinado: "bg-green-100 text-green-800",
  Cancelado: "bg-red-100 text-red-700",
};

interface ContractListProps extends UseContractsOptions {
  onSelectContract?: (contract: Contract) => void;
}

function ContractRow({
  contract,
  onClick,
}: {
  contract: Contract;
  onClick?: () => void;
}) {
  const statusClass =
    STATUS_STYLES[contract.status as ContractStatus] ??
    "bg-gray-100 text-gray-700";

  return (
    <tr
      onClick={onClick}
      className={`border-b border-gray-100 transition-colors ${
        onClick ? "cursor-pointer hover:bg-gray-50" : ""
      }`}
    >
      <td className="py-3 pr-4 text-sm font-mono font-medium text-gray-900">
        {contract.id}
      </td>
      <td className="py-3 pr-4 text-sm text-gray-600">{contract.order_id}</td>
      <td className="py-3 pr-4">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}`}
        >
          {contract.status}
        </span>
      </td>
      <td className="py-3 pr-4 text-sm text-gray-500">
        {contract.signed_at
          ? new Date(contract.signed_at).toLocaleDateString("pt-BR")
          : "—"}
      </td>
      <td className="py-3 text-sm text-gray-500">
        {contract.created_at ? new Date(contract.created_at).toLocaleDateString("pt-BR") : "—"}
      </td>
    </tr>
  );
}

export const ContractList: React.FC<ContractListProps> = ({
  onSelectContract,
  ...options
}) => {
  const { contracts, loading, error, refetch } = useContracts(options);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 p-5 text-center text-sm text-red-600">
        Erro: {error.message}
        <button onClick={refetch} className="ml-3 underline">
          Tentar novamente
        </button>
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">
        Nenhum contrato encontrado.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              ID
            </th>
            <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Pedido
            </th>
            <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Status
            </th>
            <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Assinado em
            </th>
            <th className="py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Criado em
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 px-4">
          {contracts.map((c) => (
            <ContractRow
              key={c.id}
              contract={c}
              onClick={onSelectContract ? () => onSelectContract(c) : undefined}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ContractList;
