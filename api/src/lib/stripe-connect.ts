/**
 * Stripe Connect — split payment para fornecedores.
 *
 * Fluxo:
 *   1. Fornecedor faz onboarding via /api/companies/:id/stripe/onboarding
 *      → Stripe gera link de KYC, fornecedor preenche dados bancários no Stripe
 *   2. Quando demandante paga, criamos PaymentIntent com:
 *      - amount: valor total
 *      - application_fee_amount: comissão CapaCity (3% + 5%)
 *      - transfer_data.destination: stripe_account_id do fornecedor
 *   3. Stripe automaticamente faz split: demandante paga → CapaCity recebe
 *      comissão → fornecedor recebe líquido
 *
 * Requer:
 *   STRIPE_SECRET_KEY  — sk_live_... ou sk_test_...
 *   STRIPE_CONNECT_REFRESH_URL  — onde redirecionar se onboarding incompleto
 *   STRIPE_CONNECT_RETURN_URL   — onde voltar após onboarding sucesso
 *
 * Conformidade: CapaCity precisa de conta Stripe Brasil aprovada e plataforma
 * Connect habilitada. Em dev sem conta, todas as funções são no-op.
 */

import { stripe, isStripeEnabled } from "./stripe";

// Aliases para manter API consistente com o resto do código
const stripeEnabled = isStripeEnabled;
const getStripe = (): ReturnType<typeof stripe> | null => {
  try {
    return stripeEnabled() ? stripe() : null;
  } catch {
    return null;
  }
};
import { query } from "../db";
import { logger } from "./logger";

const PLATFORM_FEE_PCT_DEMANDANTE = Number(process.env.PLATFORM_FEE_PCT_DEMANDANTE) || 3;
const PLATFORM_FEE_PCT_FORNECEDOR = Number(process.env.PLATFORM_FEE_PCT_FORNECEDOR) || 5;

export interface ConnectOnboardingResult {
  url: string;
  accountId: string;
  expires_at: number;
}

/**
 * Cria conta Express Connect para um fornecedor e retorna URL de onboarding.
 */
export async function createConnectOnboarding(companyId: string): Promise<ConnectOnboardingResult | null> {
  if (!stripeEnabled()) return null;
  const stripe = getStripe();
  if (!stripe) return null;

  const { rows } = await query<{
    id: string;
    name: string;
    cnpj: string | null;
    stripe_account_id: string | null;
    city: string | null;
    site: string | null;
  }>(
    "SELECT id, name, cnpj, stripe_account_id, city, site FROM companies WHERE id = $1",
    [companyId]
  );
  const company = rows[0];
  if (!company) throw new Error("Empresa não encontrada.");

  // Reutiliza conta existente ou cria nova
  let accountId: string | null = company.stripe_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "BR",
      business_type: "company",
      company: {
        name: company.name,
        tax_id: company.cnpj?.replace(/\D/g, "") || undefined,
      },
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
      metadata: {
        capacity_company_id: company.id,
      },
    });
    accountId = account.id;
    await query("UPDATE companies SET stripe_account_id = $1 WHERE id = $2", [accountId, companyId]);
    logger.info({ companyId, accountId }, "[stripe-connect] account created");
  }

  // Cria link de onboarding (expira em 1h)
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: process.env.STRIPE_CONNECT_REFRESH_URL
      || `${process.env.APP_URL || "https://capacity.com.br"}/configuracoes/financeiro?refresh=1`,
    return_url: process.env.STRIPE_CONNECT_RETURN_URL
      || `${process.env.APP_URL || "https://capacity.com.br"}/configuracoes/financeiro?onboarded=1`,
    type: "account_onboarding",
  });

  return {
    url: link.url,
    accountId,
    expires_at: link.expires_at,
  };
}

/**
 * Verifica se a conta Connect do fornecedor está habilitada para receber pagamentos.
 * Atualiza colunas locais: stripe_charges_enabled, stripe_payouts_enabled.
 */
export async function syncConnectStatus(companyId: string): Promise<{
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  requirements?: string[];
} | null> {
  if (!stripeEnabled()) return null;
  const stripe = getStripe();
  if (!stripe) return null;

  const { rows } = await query<{ stripe_account_id: string | null }>(
    "SELECT stripe_account_id FROM companies WHERE id = $1",
    [companyId]
  );
  const accountId = rows[0]?.stripe_account_id;
  if (!accountId) return null;

  const account = await stripe.accounts.retrieve(accountId);
  const requirements = [
    ...(account.requirements?.currently_due || []),
    ...(account.requirements?.past_due || []),
  ];

  await query(
    `UPDATE companies SET
       stripe_charges_enabled = $1,
       stripe_payouts_enabled = $2,
       stripe_details_submitted = $3,
       stripe_synced_at = NOW()
     WHERE id = $4`,
    [
      Boolean(account.charges_enabled),
      Boolean(account.payouts_enabled),
      Boolean(account.details_submitted),
      companyId,
    ]
  ).catch(() => undefined);

  return {
    charges_enabled: Boolean(account.charges_enabled),
    payouts_enabled: Boolean(account.payouts_enabled),
    details_submitted: Boolean(account.details_submitted),
    requirements,
  };
}

/**
 * Cria PaymentIntent com split automático para o fornecedor.
 *
 * Comissão total da plataforma = (3% demandante + 5% fornecedor) sobre o valor.
 * Stripe garante atomicidade: ou o pagamento + split ocorrem juntos, ou nada.
 *
 * @param amountCents Valor em centavos (BRL)
 * @param supplierAccountId Stripe Connect account ID do fornecedor
 * @param orderId ID do pedido CapaCity (vai pra metadata)
 */
export async function createSplitPaymentIntent(opts: {
  amountCents: number;
  supplierAccountId: string;
  orderId: string;
  txnId: string;
  customerEmail?: string;
}): Promise<{ clientSecret: string; paymentIntentId: string; applicationFeeCents: number } | null> {
  if (!stripeEnabled()) return null;
  const stripe = getStripe();
  if (!stripe) return null;

  if (opts.amountCents < 50) {
    throw new Error("Valor mínimo de R$ 0,50.");
  }

  const totalFeePct = PLATFORM_FEE_PCT_DEMANDANTE + PLATFORM_FEE_PCT_FORNECEDOR;
  const applicationFeeCents = Math.round(opts.amountCents * totalFeePct / 100);

  const intent = await stripe.paymentIntents.create({
    amount: opts.amountCents,
    currency: "brl",
    payment_method_types: ["card", "pix"],
    application_fee_amount: applicationFeeCents,
    transfer_data: {
      destination: opts.supplierAccountId,
    },
    receipt_email: opts.customerEmail,
    metadata: {
      orderId: opts.orderId,
      txnId: opts.txnId,
      platform: "capacity",
      fee_pct: String(totalFeePct),
    },
  });

  logger.info(
    { orderId: opts.orderId, txnId: opts.txnId, applicationFeeCents, amountCents: opts.amountCents },
    "[stripe-connect] split payment intent created"
  );

  return {
    clientSecret: intent.client_secret || "",
    paymentIntentId: intent.id,
    applicationFeeCents,
  };
}

/**
 * Calcula comissão para preview no frontend (antes do pagamento).
 */
export function calculateFees(grossCents: number): {
  grossCents: number;
  platformFeeCents: number;
  supplierNetCents: number;
  demandantePct: number;
  fornecedorPct: number;
} {
  const platformFeeCents = Math.round(
    grossCents * (PLATFORM_FEE_PCT_DEMANDANTE + PLATFORM_FEE_PCT_FORNECEDOR) / 100
  );
  return {
    grossCents,
    platformFeeCents,
    supplierNetCents: grossCents - platformFeeCents,
    demandantePct: PLATFORM_FEE_PCT_DEMANDANTE,
    fornecedorPct: PLATFORM_FEE_PCT_FORNECEDOR,
  };
}
