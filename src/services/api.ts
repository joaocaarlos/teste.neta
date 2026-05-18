/**
 * API client service
 */
import { getCookie, clearLegacySession } from "../utils";

const API_BASE = "/api";
const TOKEN_KEY = "cap4_jwt";
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

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
 * GET request helper - automatically handles JSON and error display
 */
export async function apiGet<T = any>(path: string): Promise<T[]> {
  try {
    const r = await apiFetch(path);
    const json = await r.json().catch(() => null);

    if (!r.ok) {
      console.error(`API Error: ${path}`, json?.error || `Failed to fetch`);
      return [];
    }

    return Array.isArray(json?.data) ? json.data : json;
  } catch (e) {
    console.error(`API Connection Error: ${path}`, e);
    return [];
  }
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
