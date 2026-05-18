/**
 * Global Zustand store split into three slices:
 *   - authSlice       : user session, login/logout/register
 *   - notificationSlice : in-app notifications feed
 *   - uiSlice         : toasts and modals
 *
 * Usage:
 *   import { useStore } from "../store";
 *   const user = useStore((s) => s.user);
 *   const login = useStore((s) => s.login);
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  User,
  UserRole,
  Notification,
  Toast,
  ToastType,
  ModalState,
} from "../types";

// ─── API helpers ─────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL ?? "";

function token(): string | null {
  return localStorage.getItem("capacity_token");
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tok = token();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (tok) headers["Authorization"] = `Bearer ${tok}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText })) as { error: string };
    throw new Error(body.error ?? res.statusText);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ─── Auth slice ───────────────────────────────────────────────────────────────

interface AuthSlice {
  user: User | null;
  token: string | null;

  login: (email: string, password: string, totpCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    company_name?: string;
    cnpj?: string;
  }) => Promise<void>;
  refreshMe: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
}

function createAuthSlice(
  set: (
    partial:
      | Partial<StoreState>
      | ((state: StoreState) => Partial<StoreState>)
  ) => void
): AuthSlice {
  return {
    user: null,
    token: null,

    login: async (email, password, totpCode) => {
      const res = await apiFetch<{ token: string; user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, totp_code: totpCode }),
      });
      localStorage.setItem("capacity_token", res.token);
      set({ user: res.user, token: res.token });
    },

    logout: async () => {
      try {
        await apiFetch("/api/auth/logout", { method: "POST" });
      } catch {
        // Best effort — clear local state regardless
      }
      localStorage.removeItem("capacity_token");
      set({ user: null, token: null, notifications: [], unreadCount: 0 });
    },

    register: async (data) => {
      const res = await apiFetch<{ token: string; user: User }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      });
      // If email verification is required, token may not be present
      if (res.token) {
        localStorage.setItem("capacity_token", res.token);
        set({ user: res.user, token: res.token });
      }
    },

    refreshMe: async () => {
      try {
        const user = await apiFetch<User>("/api/auth/me");
        set({ user });
      } catch {
        localStorage.removeItem("capacity_token");
        set({ user: null, token: null });
      }
    },

    updateUser: (patch) => {
      set((state: StoreState) => ({
        user: state.user ? { ...state.user, ...patch } : null,
      }));
    },
  };
}

// ─── Notification slice ───────────────────────────────────────────────────────

interface NotificationSlice {
  notifications: Notification[];
  unreadCount: number;

  fetchNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  pushNotification: (n: Notification) => void;
}

function createNotificationSlice(
  set: (partial: Partial<StoreState> | ((s: StoreState) => Partial<StoreState>)) => void
): NotificationSlice {
  return {
    notifications: [],
    unreadCount: 0,

    fetchNotifications: async () => {
      try {
        const res = await apiFetch<{ data: Notification[]; unread_count: number }>(
          "/api/notifications?limit=50"
        );
        set({
          notifications: res.data,
          unreadCount: res.unread_count,
        });
      } catch {
        // Silently fail — user may not be authenticated yet
      }
    },

    markRead: async (id) => {
      await apiFetch(`/api/notifications/${id}`, { method: "PATCH" });
      set((s: StoreState) => ({
        notifications: s.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, s.unreadCount - 1),
      }));
    },

    markAllRead: async () => {
      await apiFetch("/api/notifications/mark-all-read", { method: "POST" });
      set((s: StoreState) => ({
        notifications: s.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    },

    pushNotification: (n) => {
      set((s: StoreState) => ({
        notifications: [n, ...s.notifications],
        unreadCount: n.read ? s.unreadCount : s.unreadCount + 1,
      }));
    },
  };
}

// ─── UI slice ─────────────────────────────────────────────────────────────────

interface UISlice {
  toasts: Toast[];
  modal: ModalState;

  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  openModal: (componentKey: string, props?: Record<string, unknown>) => void;
  closeModal: () => void;

  /** Convenience shortcuts */
  toastSuccess: (title: string, message?: string) => void;
  toastError: (title: string, message?: string) => void;
  toastInfo: (title: string, message?: string) => void;
  toastWarning: (title: string, message?: string) => void;
}

let toastCounter = 0;

function createUISlice(
  set: (partial: Partial<StoreState> | ((s: StoreState) => Partial<StoreState>)) => void
): UISlice {
  const addToast = (toast: Omit<Toast, "id">) => {
    const id = `toast-${++toastCounter}`;
    const duration = toast.duration ?? 4000;
    set((s: StoreState) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        set((s: StoreState) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
  };

  const shortcut = (type: ToastType) => (title: string, message?: string) =>
    addToast({ type, title, message });

  return {
    toasts: [],
    modal: { open: false },

    addToast,

    removeToast: (id) => {
      set((s: StoreState) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    },

    openModal: (componentKey, props) => {
      set({ modal: { open: true, componentKey, props } });
    },

    closeModal: () => {
      set({ modal: { open: false } });
    },

    toastSuccess: shortcut("success"),
    toastError: shortcut("error"),
    toastInfo: shortcut("info"),
    toastWarning: shortcut("warning"),
  };
}

// ─── Combined store ───────────────────────────────────────────────────────────

type StoreState = AuthSlice & NotificationSlice & UISlice;

export const useStore = create<StoreState>()(
  persist(
    (set, _get) => ({
      ...createAuthSlice(set as Parameters<typeof createAuthSlice>[0]),
      ...createNotificationSlice(
        set as (partial: Partial<StoreState> | ((s: StoreState) => Partial<StoreState>)) => void
      ),
      ...createUISlice(
        set as (partial: Partial<StoreState> | ((s: StoreState) => Partial<StoreState>)) => void
      ),
    }),
    {
      name: "capacity-store",
      storage: createJSONStorage(() => localStorage),
      // Only persist auth state — UI/notification state should be fresh each session
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
);

// ─── Convenience selectors ───────────────────────────────────────────────────

export const selectUser = (s: StoreState) => s.user;
export const selectToken = (s: StoreState) => s.token;
export const selectIsAuthenticated = (s: StoreState) => !!s.user;
export const selectRole = (s: StoreState) => s.user?.role ?? null;
export const selectUnreadCount = (s: StoreState) => s.unreadCount;
export const selectNotifications = (s: StoreState) => s.notifications;
export const selectToasts = (s: StoreState) => s.toasts;
export const selectModal = (s: StoreState) => s.modal;
