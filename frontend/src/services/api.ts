/**
 * API client service
 */
import { getCookie, clearLegacySession } from "../utils";

const API_BASE = "/api";
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Retry helper with exponential backoff.
 * Retries on network errors (status 0) and server errors (5xx).
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 500): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (retries > 0 && (!status || status >= 500)) {
      await new Promise(r => setTimeout(r, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw err;
  }
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

export type RequestOptions = RequestInit & {
  headers?: Record<string, string>;
};

/**
 * Perform API request with CSRF protection
 */
export async function apiFetch(
  path: string,
  options: RequestOptions = {}
): Promise<Response> {
  const isForm = options.body instanceof FormData;
  const csrf = getCookie("csrf_token");
  const method = (options.method || "GET").toUpperCase();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(UNSAFE_METHODS.has(method) && csrf
        ? { "X-CSRF-Token": csrf }
        : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    clearLegacySession();
    if (
      !path.startsWith("/auth/login") &&
      !path.startsWith("/auth/reset-password") &&
      !path.startsWith("/auth/me")
    ) {
      window.location.href = "/";
    }
  }

  return res;
}

/**
 * GET request helper — returns a typed ApiResult.
 * Automatically retries on network errors (status 0) and 5xx responses (up to 2 retries).
 */
export async function apiGet<T = unknown>(path: string): Promise<ApiResult<T>> {
  return withRetry(async () => {
    const r = await apiFetch(path);
    const json = await r.json().catch(() => null);

    if (!r.ok) {
      const err = { status: r.status, message: json?.error ?? "Request failed" };
      // Throw on 5xx so withRetry can attempt again; return directly for 4xx
      if (r.status >= 500) throw err;
      return { ok: false, error: err.message, status: r.status } as ApiResult<T>;
    }

    const data: T = json?.data !== undefined ? json.data : json;
    return { ok: true, data } as ApiResult<T>;
  }).catch((e) => ({
    ok: false,
    error: (e as { message?: string }).message ?? "Network error",
    status: (e as { status?: number }).status ?? 0,
  } as ApiResult<T>));
}

/**
 * GET list helper — unwraps an array result, returning [] on failure.
 * Use when the caller only needs the list and doesn't need to distinguish error states.
 * Inherits retry behaviour from apiGet (retries on network errors and 5xx).
 */
export async function apiGetList<T = unknown>(path: string): Promise<T[]> {
  const result = await apiGet<T[]>(path);
  if (!result.ok) {
    console.error(`API Error [${path}]:`, result.error);
    return [];
  }
  return Array.isArray(result.data) ? result.data : [];
}

/**
 * POST request helper
 */
export async function apiPost<T = any>(
  path: string,
  data: any
): Promise<T | null> {
  try {
    const res = await apiFetch(path, {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || `POST failed: ${path}`);
    }

    return await res.json();
  } catch (e) {
    console.error(`API Error: ${path}`, e);
    throw e;
  }
}

/**
 * PATCH request helper
 */
export async function apiPatch<T = any>(
  path: string,
  data: any
): Promise<T | null> {
  try {
    const res = await apiFetch(path, {
      method: "PATCH",
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || `PATCH failed: ${path}`);
    }

    return await res.json();
  } catch (e) {
    console.error(`API Error: ${path}`, e);
    throw e;
  }
}

/**
 * DELETE request helper
 */
export async function apiDelete<T = any>(path: string): Promise<T | null> {
  try {
    const res = await apiFetch(path, { method: "DELETE" });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || `DELETE failed: ${path}`);
    }

    return await res.json();
  } catch (e) {
    console.error(`API Error: ${path}`, e);
    throw e;
  }
}

/**
 * Upload file helper
 */
export async function apiUpload(
  path: string,
  files: File[]
): Promise<any | null> {
  try {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));

    const res = await apiFetch(path, {
      method: "POST",
      body: fd,
    });

    if (!res.ok) {
      throw new Error(`Upload failed: ${path}`);
    }

    return await res.json();
  } catch (e) {
    console.error(`Upload Error: ${path}`, e);
    throw e;
  }
}
