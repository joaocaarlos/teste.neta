/**
 * Toast notification system
 */

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

let toasts: Toast[] = [];
let listeners: ((toasts: Toast[]) => void)[] = [];

export const toast = {
  success(message: string, duration = 3000) {
    addToast(message, "success", duration);
  },
  error(message: string, duration = 4000) {
    addToast(message, "error", duration);
  },
  info(message: string, duration = 3000) {
    addToast(message, "info", duration);
  },
  warning(message: string, duration = 3500) {
    addToast(message, "warning", duration);
  },
};

function addToast(message: string, type: ToastType, duration: number) {
  const id = `toast-${Date.now()}-${Math.random()}`;
  const newToast: Toast = { id, message, type, duration };

  toasts = [...toasts, newToast];
  notifyListeners();

  setTimeout(() => {
    removeToast(id);
  }, duration);
}

function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notifyListeners();
}

function notifyListeners() {
  listeners.forEach((listener) => listener(toasts));
}

export function subscribeToToasts(listener: (toasts: Toast[]) => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function getToasts() {
  return toasts;
}
