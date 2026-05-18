import Stripe from "stripe";

type StripeClient = InstanceType<typeof Stripe>;

let stripeClient: StripeClient | null = null;

function getStripeSecretKey(): string | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!/^sk_(test|live)_/.test(key) || key.length < 50) return null;
  return key;
}

export function isStripeEnabled(): boolean {
  return (process.env.PAYMENTS_PROVIDER || "").toLowerCase() === "stripe" && Boolean(getStripeSecretKey());
}

export function stripe(): StripeClient {
  const secretKey = getStripeSecretKey();
  if (!isStripeEnabled()) {
    const err = new Error("Pagamentos Stripe nao configurados ou chave secreta incompleta.") as Error & { statusCode?: number };
    err.statusCode = 501;
    throw err;
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey!, {
      apiVersion: "2026-04-22.dahlia",
    });
  }
  return stripeClient;
}

export function amountToCents(value: unknown): number {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) {
    const err = new Error("Valor de pagamento invalido.") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }
  return Math.round(n * 100);
}
