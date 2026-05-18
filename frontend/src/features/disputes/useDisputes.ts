import { useQuery, useMutation, type UseQueryOptions } from "../../hooks/useApi";
import type {
  Dispute,
  DisputeCreateInput,
  DisputeMessage,
  PaginatedResponse,
} from "../../types";

// ─── List disputes ────────────────────────────────────────────────────────────

export interface UseDisputesOptions extends UseQueryOptions {
  orderId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export function useDisputes(options: UseDisputesOptions = {}) {
  const { orderId, status, limit = 20, offset = 0, ...queryOpts } = options;

  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (orderId) params.set("order_id", orderId);
  if (status) params.set("status", status);

  const result = useQuery<PaginatedResponse<Dispute> | Dispute[]>(
    `/api/disputes?${params.toString()}`,
    queryOpts
  );

  const disputes: Dispute[] = Array.isArray(result.data)
    ? result.data
    : (result.data?.data ?? []);

  const total: number = Array.isArray(result.data)
    ? disputes.length
    : (result.data?.meta?.total ?? 0);

  return { ...result, disputes, total };
}

// ─── Single dispute ───────────────────────────────────────────────────────────

export function useDispute(id: string | null) {
  return useQuery<Dispute>(`/api/disputes/${id}`, { enabled: !!id });
}

// ─── Dispute messages ─────────────────────────────────────────────────────────

export function useDisputeMessages(disputeId: string | null) {
  return useQuery<DisputeMessage[]>(`/api/disputes/${disputeId}/messages`, {
    enabled: !!disputeId,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useOpenDispute() {
  return useMutation<Dispute, DisputeCreateInput>("/api/disputes", "POST");
}

export function useResolveDispute(id: string) {
  return useMutation<Dispute, { resolution: string }>(`/api/disputes/${id}/resolve`, "POST");
}

export function useCloseDispute(id: string) {
  return useMutation<void>(`/api/disputes/${id}/close`, "POST");
}

export function useSendDisputeMessage(disputeId: string) {
  return useMutation<DisputeMessage, { body: string }>(
    `/api/disputes/${disputeId}/messages`,
    "POST"
  );
}
