/**
 * Sentry integration — opcional.
 *
 * Estratégia: carrega o SDK via CDN apenas quando VITE_SENTRY_DSN está definido.
 * Isso evita:
 *   - Bundle inflado em dev/staging
 *   - Dependência hard de @sentry/react (que pode não estar instalado)
 *   - Erros de build quando SDK não está em node_modules
 *
 * Em dev (sem DSN): no-op total — função retorna imediatamente.
 */

let initialized = false;

declare global {
  interface Window {
    Sentry?: {
      init: (opts: Record<string, unknown>) => void;
      captureException: (err: unknown, ctx?: Record<string, unknown>) => void;
    };
  }
}

export async function initSentry(): Promise<void> {
  if (typeof window === "undefined") return;
  if (initialized) return;

  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn || import.meta.env.MODE === "development") return;

  try {
    const SDK_URL =
      (import.meta.env.VITE_SENTRY_SDK_URL as string | undefined) ||
      "https://browser.sentry-cdn.com/8.55.0/bundle.tracing.replay.min.js";

    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SDK_URL;
      s.crossOrigin = "anonymous";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Sentry SDK failed to load"));
      document.head.appendChild(s);
    });

    if (!window.Sentry?.init) return;

    window.Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE) || 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
    initialized = true;
  } catch {
    // Silently ignore — Sentry é opcional
  }
}

export function captureException(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (!initialized) return;
  try {
    window.Sentry?.captureException(error, context ? { extra: context } : undefined);
  } catch {
    // silently
  }
}
