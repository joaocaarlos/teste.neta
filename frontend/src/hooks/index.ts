/**
 * Custom React hooks for common patterns
 */
import { useState, useCallback, useEffect } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "../services/api";
import { toast } from "../utils/toast";

/**
 * Hook: Fetch data from API
 */
export function useFetch<T = any[]>(
  path: string,
  enabled: boolean = true,
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    (async () => {
      try {
        setLoading(true);
        const result = await apiGet<T>(path);
        if (isMounted) {
          setData(Array.isArray(result) ? (result as any) : (result as any));
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [path, enabled, ...deps]);

  return { data, loading, error };
}

/**
 * Hook: Create mutation (POST)
 */
export function useCreateMutation<T = any>(endpoint: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (data: any) => {
      try {
        setLoading(true);
        setError(null);
        const result = await apiPost<T>(endpoint, data);
        toast.success("Criado com sucesso!");
        return result;
      } catch (err) {
        const message = (err as Error).message || "Erro ao criar";
        setError(err as Error);
        toast.error(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [endpoint]
  );

  return { mutate, loading, error };
}

/**
 * Hook: Update mutation (PATCH)
 */
export function useUpdateMutation<T = any>(endpoint: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (data: any) => {
      try {
        setLoading(true);
        setError(null);
        const result = await apiPatch<T>(endpoint, data);
        toast.success("Atualizado com sucesso!");
        return result;
      } catch (err) {
        const message = (err as Error).message || "Erro ao atualizar";
        setError(err as Error);
        toast.error(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [endpoint]
  );

  return { mutate, loading, error };
}

/**
 * Hook: Delete mutation
 */
export function useDeleteMutation(endpoint: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        setError(null);
        await apiDelete(`${endpoint}/${id}`);
        toast.success("Deletado com sucesso!");
      } catch (err) {
        const message = (err as Error).message || "Erro ao deletar";
        setError(err as Error);
        toast.error(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [endpoint]
  );

  return { mutate, loading, error };
}

/**
 * Hook: Toggle boolean state
 */
export function useToggle(initialValue: boolean = false) {
  const [value, setValue] = useState(initialValue);
  const toggle = useCallback(() => setValue((v) => !v), []);
  return [value, toggle, setValue] as const;
}

/**
 * Hook: Async operation with loading and error states
 */
export function useAsync<T = any>(
  asyncFunction: () => Promise<T>,
  immediate: boolean = true
) {
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">(
    "idle"
  );
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    setStatus("pending");
    setData(null);
    setError(null);

    try {
      const result = await asyncFunction();
      setData(result);
      setStatus("success");
      return result;
    } catch (err) {
      setError(err as Error);
      setStatus("error");
      throw err;
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { execute, status, data, error };
}

/**
 * Hook: Local storage state
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch {
        console.error("Error saving to localStorage");
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue] as const;
}

/**
 * Hook: Debounced value
 */
export function useDebounce<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
