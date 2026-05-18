/**
 * Generic API hooks — useQuery and useMutation.
 *
 * These sit on top of the existing services/api helpers and add
 * React state management (loading, error, data) around every call.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { ApiError } from "../types";

// ─── Base fetch helper ────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL ?? "";

function getToken(): string | null {
  try {
    // Try localStorage first, then sessionStorage
    return (
      localStorage.getItem("capacity_token") ??
      sessionStorage.getItem("capacity_token") ??
      null
    );
  } catch {
    return null;
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "include" });

  if (!res.ok) {
    let body: ApiError = { error: res.statusText };
    try {
      body = (await res.json()) as ApiError;
    } catch {
      // ignore parse error
    }
    const err = new Error(body.error ?? res.statusText) as Error & { status: number; body: ApiError };
    err.status = res.status;
    err.body = body;
    throw err;
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ─── useQuery ────────────────────────────────────────────────────────────────

export interface UseQueryOptions {
  /** Skip the fetch (e.g. while waiting for a required param). */
  enabled?: boolean;
  /** Dependency array — when any value changes, refetch. */
  deps?: unknown[];
}

export interface UseQueryResult<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetch data from a GET endpoint and cache it in component state.
 *
 * @example
 * const { data, loading, error, refetch } = useQuery<Demand[]>("/api/demands?limit=20");
 */
export function useQuery<T>(
  path: string,
  options: UseQueryOptions = {}
): UseQueryResult<T> {
  const { enabled = true, deps = [] } = options;

  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Track whether the component is still mounted before calling setState
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetch = useCallback(() => {
    if (!enabled) return;
    setLoading(true);
    setError(null);

    apiFetch<T>(path)
      .then((result) => {
        if (!mountedRef.current) return;
        setData(result);
      })
      .catch((err: Error) => {
        if (!mountedRef.current) return;
        setError(err);
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, enabled, ...deps]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ─── useMutation ─────────────────────────────────────────────────────────────

export interface UseMutationResult<TData, TInput = unknown> {
  mutate: (input?: TInput) => Promise<TData>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * Execute a non-GET request (POST, PATCH, PUT, DELETE).
 *
 * @example
 * const { mutate, loading } = useMutation<Order>("/api/proposals/PR-1/accept", "POST");
 * const order = await mutate();
 */
export function useMutation<TData, TInput = unknown>(
  path: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE" = "POST"
): UseMutationResult<TData, TInput> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reset = useCallback(() => setError(null), []);

  const mutate = useCallback(
    async (input?: TInput): Promise<TData> => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiFetch<TData>(path, {
          method,
          body: input !== undefined ? JSON.stringify(input) : undefined,
        });
        return result;
      } catch (err) {
        if (mountedRef.current) setError(err as Error);
        throw err;
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [path, method]
  );

  return { mutate, loading, error, reset };
}

// ─── useFileUpload ────────────────────────────────────────────────────────────

export interface UseFileUploadResult {
  upload: (file: File) => Promise<{ id: string; url: string }>;
  loading: boolean;
  error: Error | null;
  progress: number;
}

export function useFileUpload(endpoint = "/api/uploads"): UseFileUploadResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  const upload = useCallback(
    async (file: File): Promise<{ id: string; url: string }> => {
      setLoading(true);
      setError(null);
      setProgress(0);

      const token = getToken();
      const formData = new FormData();
      formData.append("file", file);

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE}${endpoint}`);
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.withCredentials = true;

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        });

        xhr.addEventListener("load", () => {
          setLoading(false);
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const json = JSON.parse(xhr.responseText) as { id: string; url: string };
              resolve(json);
            } catch {
              reject(new Error("Invalid response"));
            }
          } else {
            const err = new Error(`Upload failed: ${xhr.statusText}`);
            setError(err);
            reject(err);
          }
        });

        xhr.addEventListener("error", () => {
          const err = new Error("Network error during upload");
          setLoading(false);
          setError(err);
          reject(err);
        });

        xhr.send(formData);
      });
    },
    [endpoint]
  );

  return { upload, loading, error, progress };
}
