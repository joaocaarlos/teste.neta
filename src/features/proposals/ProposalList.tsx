import React from "react";
import type { Proposal } from "../../types";
import { useProposals, type UseProposalsOptions } from "./useProposals";
import { ProposalCard } from "./ProposalCard";
import { useStore, selectUser } from "../../store";

interface ProposalListProps {
  /** Filter by a specific demand. If omitted, shows proposals for the current company. */
  demandId?: string;
  status?: string;
  limit?: number;
  /** Whether the current user can accept proposals (demandante on their demand) */
  isBuyer?: boolean;
  onProposalAccepted?: (proposal: Proposal) => void;
}

export const ProposalList: React.FC<ProposalListProps> = ({
  demandId,
  status,
  limit = 20,
  isBuyer = false,
  onProposalAccepted,
}) => {
  const user = useStore(selectUser);
  const { proposals, loading, error, refetch } = useProposals({
    demandId,
    status,
    limit,
  });

  const isSupplier = user?.role === "fornecedor";

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-2xl bg-gray-100"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center text-sm text-red-600">
        <p>Erro ao carregar propostas: {error.message}</p>
        <button
          onClick={refetch}
          className="mt-2 text-red-700 underline hover:no-underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">
        {demandId
          ? "Nenhuma proposta recebida ainda."
          : "Você ainda não enviou propostas."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {proposals.map((proposal) => (
        <ProposalCard
          key={proposal.id}
          proposal={proposal}
          isBuyer={isBuyer}
          isSupplier={isSupplier}
          onAccepted={(p) => {
            refetch();
            onProposalAccepted?.(p);
          }}
          onWithdrawn={refetch}
        />
      ))}
    </div>
  );
};

export default ProposalList;
