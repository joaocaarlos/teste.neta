/**
 * Carregamento dinâmico do Stripe.js no frontend.
 *
 * Carrega o SDK via CDN (não precisa instalar @stripe/stripe-js como dep).
 * Inicializa Stripe com a publishable key da env.
 *
 * Uso:
 *   const stripe = await getStripe();
 *   await stripe.redirectToCheckout({ sessionId });
 */

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => StripeInstance;
  }
}

export interface StripeInstance {
  redirectToCheckout: (opts: { sessionId: string }) => Promise<{ error?: { message: string } }>;
  confirmCardPayment: (clientSecret: string, opts?: unknown) => Promise<unknown>;
  elements: (opts?: unknown) => unknown;
}

let stripeInstance: StripeInstance | null = null;
let loadPromise: Promise<StripeInstance | null> | null = null;

export function getStripePublishableKey(): string | null {
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
  if (!key || !key.startsWith("pk_")) return null;
  return key;
}

export function stripeEnabled(): boolean {
  return getStripePublishableKey() !== null;
}

async function loadStripeJs(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.Stripe) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[src*="js.stripe.com"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Stripe.js failed to load")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://js.stripe.com/v3/";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Stripe.js failed to load"));
    document.head.appendChild(s);
  });
}

export async function getStripe(): Promise<StripeInstance | null> {
  if (stripeInstance) return stripeInstance;
  if (loadPromise) return loadPromise;

  const publishableKey = getStripePublishableKey();
  if (!publishableKey) {
    console.warn("[stripe] VITE_STRIPE_PUBLISHABLE_KEY não configurada");
    return null;
  }

  loadPromise = (async () => {
    try {
      await loadStripeJs();
      if (!window.Stripe) throw new Error("Stripe global não disponível após carregamento");
      stripeInstance = window.Stripe(publishableKey);
      return stripeInstance;
    } catch (err) {
      console.error("[stripe] Erro ao carregar:", err);
      loadPromise = null;
      return null;
    }
  })();

  return loadPromise;
}

/**
 * Inicia checkout redirect — usa o endpoint backend /api/transactions/:id/checkout
 * que retorna { checkoutUrl } para redirect.
 */
export async function startCheckout(transactionId: string, apiFetch: (path: string, opts?: any) => Promise<Response>): Promise<void> {
  const res = await apiFetch(`/transactions/${transactionId}/checkout`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao iniciar pagamento.");
  }
  const data = await res.json();
  if (data.checkoutUrl) {
    window.location.href = data.checkoutUrl;
    return;
  }
  if (data.sessionId) {
    const stripe = await getStripe();
    if (!stripe) throw new Error("Stripe não inicializado.");
    const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId });
    if (error) throw new Error(error.message);
  }
}
