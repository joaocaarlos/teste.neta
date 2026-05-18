import { useQuery, useMutation, type UseQueryOptions } from "../../hooks/useApi";
import type { Contract, PaginatedResponse } from "../../types";

export interface UseContractsOptions extends UseQueryOptions {
  orderId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export function useContracts(options: UseContractsOptions = {}) {
  const { orderId, status, limit = 20, offset = 0, ...queryOpts } = options;

  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (orderId) params.set("order_id", orderId);
  if (status) params.set("status", status);

  const result = useQuery<PaginatedResponse<Contract> | Contract[]>(
    `/api/contracts?${params.toString()}`,
    queryOpts
  );

  const contracts: Contract[] = Array.isArray(result.data)
    ? result.data
    : (result.data?.data ?? []);

  const total: number = Array.isArray(result.data)
    ? contracts.length
    : (result.data?.meta?.total ?? 0);

  return { ...result, contracts, total };
}

export function useContract(id: string | null) {
  return useQuery<Contract>(`/api/contracts/${id}`, { enabled: !!id });
}

export function useSignContract(id: string) {
  return useMutation<Contract>(`/api/contracts/${id}/sign`, "POST");
}

export function useCancelContract(id: string) {
  return useMutation<void>(`/api/contracts/${id}/cancel`, "POST");
}
