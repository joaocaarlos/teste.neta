import { useCallback } from "react";
import { useQuery, useMutation, type UseQueryOptions } from "../../hooks/useApi";
import type { Proposal, ProposalCreateInput, Order, PaginatedResponse } from "../../types";

// ─── List proposals ───────────────────────────────────────────────────────────

export interface UseProposalsOptions extends UseQueryOptions {
  demandId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export function useProposals(options: UseProposalsOptions = {}) {
  const { demandId, status, limit = 20, offset = 0, ...queryOpts } = options;

  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (demandId) params.set("demand_id", demandId);
  if (status) params.set("status", status);

  const result = useQuery<PaginatedResponse<Proposal> | Proposal[]>(
    `/api/proposals?${params.toString()}`,
    queryOpts
  );

  const proposals: Proposal[] = Array.isArray(result.data)
    ? result.data
    : (result.data?.data ?? []);

  const total: number = Array.isArray(result.data)
    ? proposals.length
    : (result.data?.meta?.total ?? 0);

  return { ...result, proposals, total };
}

// ─── Single proposal ──────────────────────────────────────────────────────────

export function useProposal(id: string | null) {
  return useQuery<Proposal>(`/api/proposals/${id}`, { enabled: !!id });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateProposal() {
  return useMutation<Proposal, ProposalCreateInput>("/api/proposals", "POST");
}

export function useUpdateProposal(id: string) {
  return useMutation<Proposal, Partial<ProposalCreateInput>>(`/api/proposals/${id}`, "PATCH");
}

export function useAcceptProposal(id: string) {
  return useMutation<Order>(`/api/proposals/${id}/accept`, "POST");
}

export function useWithdrawProposal(id: string) {
  return useMutation<void>(`/api/proposals/${id}/withdraw`, "POST");
}

// ─── Composed hook for proposal actions ──────────────────────────────────────

export function useProposalActions(id: string) {
  const acceptMutation = useAcceptProposal(id);
  const withdrawMutation = useWithdrawProposal(id);

  const accept = useCallback(() => acceptMutation.mutate(), [acceptMutation]);
  const withdraw = useCallback(() => withdrawMutation.mutate(), [withdrawMutation]);

  return {
    accept,
    acceptLoading: acceptMutation.loading,
    acceptError: acceptMutation.error,

    withdraw,
    withdrawLoading: withdrawMutation.loading,
    withdrawError: withdrawMutation.error,
  };
}
