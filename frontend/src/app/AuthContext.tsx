/**
 * Authentication context
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { apiFetch } from "../services/api";
import { normalizeSessionUser, clearLegacySession } from "../utils";
import { User, UserRole, AuthContextType } from "../types";

function toUser(data: unknown): User | null {
  return normalizeSessionUser(data as Record<string, unknown>) as User | null;
}
import { toast } from "../utils/toast";

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginErr, setLoginErr] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setUser(toUser(data));
          }
        } else {
          clearLegacySession();
        }
      } catch {
        clearLegacySession();
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (
      email: string,
      password: string,
      role: UserRole,
      totp: string = ""
    ): Promise<boolean | string> => {
      setLoginLoading(true);
      setLoginErr("");
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            role,
            ...(totp ? { totp } : {}),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setLoginErr(data.error || "Credenciais inválidas.");
          return data.code || false;
        }

        clearLegacySession();
        const session = toUser(data.user);
        setUser(session);
        toast.success("Login realizado com sucesso!");
        return true;
      } catch {
        setLoginErr("Erro de conexão com o servidor.");
        return false;
      } finally {
        setLoginLoading(false);
      }
    },
    []
  );

  const register = useCallback(async (form: any): Promise<boolean> => {
    setLoginLoading(true);
    setLoginErr("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoginErr(data.error || "Erro no cadastro.");
        return false;
      }

      if (!data.token) {
        setLoginErr(
          data.message || "Cadastro recebido. Verifique seu e-mail para ativar o acesso."
        );
        toast.info(
          data.message || "Verifique seu e-mail para ativar o acesso."
        );
        return false;
      }

      clearLegacySession();
      const session = toUser(data.user);
      setUser(session);
      toast.success("Cadastro realizado com sucesso!");
      return true;
    } catch {
      setLoginErr("Erro de conexão com o servidor.");
      return false;
    } finally {
      setLoginLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // Ignore errors
    }
    clearLegacySession();
    setUser(null);
    toast.info("Desconectado com sucesso!");
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((u) => {
      const next = { ...(u || {}), ...patch } as User;
      return next;
    });
  }, []);

  const value: AuthContextType = {
    user,
    authLoading,
    login,
    register,
    logout,
    updateUser,
    loginErr,
    loginLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
