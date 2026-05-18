/**
 * Exemplo de store Zustand com persistência em localStorage
 * Copie este padrão para seus stores
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Tipo do store
interface UIState {
  sidebarOpen: boolean;
  theme: "light" | "dark";
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: "light" | "dark") => void;
}

/**
 * Store com persistência automática
 * - Salva em localStorage automaticamente
 * - Carrega ao montar
 * - Sincroniza entre abas
 */
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: "light" as const,

      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
      setTheme: (theme: "light" | "dark") => set({ theme }),
    }),
    {
      name: "capacity-ui-storage", // Nome da chave em localStorage
      version: 1, // Para controlar migrations
      partialize: (state) => ({
        // Salvar apenas alguns campos se desejar
        sidebarOpen: state.sidebarOpen,
        theme: state.theme,
      }),
    }
  )
);

// ─── Notificações (também persistido) ────────────────────────────────────────

interface NotificationState {
  count: number;
  unread: number;
  lastSync: number;
  incrementUnread: () => void;
  setCount: (count: number) => void;
  updateLastSync: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      count: 0,
      unread: 0,
      lastSync: Date.now(),

      incrementUnread: () =>
        set((state) => ({
          unread: state.unread + 1,
          count: state.count + 1,
        })),

      setCount: (count: number) => set({ count, unread: 0 }),

      updateLastSync: () => set({ lastSync: Date.now() }),
    }),
    {
      name: "capacity-notifications-storage",
      version: 1,
    }
  )
);

// ─── Auth (com caution — apenas dados públicos) ──────────────────────────────

interface AuthState {
  userId: string | null;
  role: "demandante" | "fornecedor" | "admin" | null;
  companyId: string | null;
  email: string | null;
  setUser: (data: Partial<AuthState>) => void;
  clear: () => void;
}

/**
 * AVISO: Não persista tokens ou dados sensíveis!
 * Apenas IDs e metadados públicos.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      role: null,
      companyId: null,
      email: null,

      setUser: (data) => set(data),

      clear: () =>
        set({
          userId: null,
          role: null,
          companyId: null,
          email: null,
        }),
    }),
    {
      name: "capacity-auth-storage",
      version: 1,
      partialize: (state) => ({
        // Salvar apenas metadados, NUNCA tokens
        userId: state.userId,
        role: state.role,
        companyId: state.companyId,
        email: state.email,
      }),
    }
  )
);

// ─── Filtros de listagem (DX melhora) ────────────────────────────────────────

interface DemandsFilterState {
  urgency: string | null;
  status: string | null;
  sortBy: "newest" | "oldest" | "score";
  setUrgency: (urgency: string | null) => void;
  setStatus: (status: string | null) => void;
  setSortBy: (sort: "newest" | "oldest" | "score") => void;
  reset: () => void;
}

export const useDemandsFilterStore = create<DemandsFilterState>()(
  persist(
    (set) => ({
      urgency: null,
      status: null,
      sortBy: "newest" as const,

      setUrgency: (urgency) => set({ urgency }),
      setStatus: (status) => set({ status }),
      setSortBy: (sortBy) => set({ sortBy }),
      reset: () =>
        set({
          urgency: null,
          status: null,
          sortBy: "newest" as const,
        }),
    }),
    {
      name: "capacity-demands-filter-storage",
      version: 1,
    }
  )
);
