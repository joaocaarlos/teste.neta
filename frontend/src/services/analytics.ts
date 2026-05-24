/**
 * Analytics service — abstração sobre Plausible / PostHog / GA4.
 * Funciona sem provider (no-op) se nenhuma env var estiver setada.
 *
 * Eventos rastreados (lista canônica — adicionar aqui ANTES de instrumentar):
 *   - signup_started, signup_completed
 *   - login_attempted, login_succeeded, login_failed
 *   - demand_created, demand_published
 *   - proposal_sent, proposal_received, proposal_accepted, proposal_rejected
 *   - order_created, order_status_changed
 *   - contract_signed (per side)
 *   - payment_initiated, payment_completed, payment_released
 *   - dispute_opened, dispute_resolved
 *   - kyc_submitted, kyc_approved, kyc_rejected
 *   - message_sent
 *   - feedback_submitted
 */

type EventProps = Record<string, string | number | boolean | null | undefined>;

interface AnalyticsProvider {
  name: string;
  identify(userId: string, traits?: EventProps): void;
  track(event: string, props?: EventProps): void;
  page(path: string, props?: EventProps): void;
  reset(): void;
}

// ───── PostHog ─────────────────────────────────────────────────────────────
class PostHogProvider implements AnalyticsProvider {
  name = "posthog";
  private posthog: any;
  constructor(apiKey: string, host: string) {
    if (typeof window === "undefined") return;
    // Lazy load — só carrega quando há key
    import(/* @vite-ignore */ "https://unpkg.com/posthog-js@1.165.0/dist/module.esm.js" as any)
      .then((m) => {
        this.posthog = m.default;
        this.posthog.init(apiKey, {
          api_host: host,
          autocapture: false,
          capture_pageview: false,
          persistence: "localStorage",
        });
      })
      .catch(() => { /* silently fallback */ });
  }
  identify(userId: string, traits?: EventProps) { this.posthog?.identify(userId, traits); }
  track(event: string, props?: EventProps) { this.posthog?.capture(event, props); }
  page(path: string, props?: EventProps) { this.posthog?.capture("$pageview", { $current_url: path, ...props }); }
  reset() { this.posthog?.reset(); }
}

// ───── Plausible (event tracking via window.plausible) ─────────────────────
class PlausibleProvider implements AnalyticsProvider {
  name = "plausible";
  constructor(domain: string, host = "https://plausible.io") {
    if (typeof window === "undefined") return;
    const script = document.createElement("script");
    script.defer = true;
    script.dataset.domain = domain;
    script.src = `${host}/js/script.js`;
    document.head.appendChild(script);
    (window as any).plausible = (window as any).plausible || function (...args: any[]) {
      ((window as any).plausible.q = (window as any).plausible.q || []).push(args);
    };
  }
  identify(_: string, __?: EventProps) { /* Plausible não suporta identify (privacy-first) */ }
  track(event: string, props?: EventProps) {
    (window as any).plausible?.(event, { props: props || {} });
  }
  page(_path: string, _props?: EventProps) {
    (window as any).plausible?.("pageview");
  }
  reset() { /* Plausible não persiste sessão */ }
}

// ───── No-op (default em dev) ───────────────────────────────────────────────
class NoopProvider implements AnalyticsProvider {
  name = "noop";
  identify(_userId: string, _traits?: EventProps) {
    if (import.meta.env.DEV) console.debug("[analytics:noop] identify", _userId, _traits);
  }
  track(event: string, props?: EventProps) {
    if (import.meta.env.DEV) console.debug("[analytics:noop] track", event, props);
  }
  page(path: string, props?: EventProps) {
    if (import.meta.env.DEV) console.debug("[analytics:noop] page", path, props);
  }
  reset() {
    if (import.meta.env.DEV) console.debug("[analytics:noop] reset");
  }
}

// ───── Factory ─────────────────────────────────────────────────────────────
function makeProvider(): AnalyticsProvider {
  const ph = (import.meta.env.VITE_POSTHOG_KEY as string | undefined);
  const phHost = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://us.posthog.com";
  const plDomain = (import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined);
  const plHost = (import.meta.env.VITE_PLAUSIBLE_HOST as string | undefined);

  // Respeita Do-Not-Track e LGPD: se usuário negou consentimento, é no-op
  if (typeof window !== "undefined") {
    const consent = localStorage.getItem("cap4_cookie_consent");
    if (consent === "denied") return new NoopProvider();
    if (navigator.doNotTrack === "1") return new NoopProvider();
  }

  if (ph) return new PostHogProvider(ph, phHost);
  if (plDomain) return new PlausibleProvider(plDomain, plHost);
  return new NoopProvider();
}

let _provider: AnalyticsProvider | null = null;
function provider(): AnalyticsProvider {
  if (!_provider) _provider = makeProvider();
  return _provider;
}

// ───── API pública ─────────────────────────────────────────────────────────
export const analytics = {
  identify: (userId: string, traits?: EventProps) => provider().identify(userId, traits),
  track:    (event: string, props?: EventProps)   => provider().track(event, props),
  page:     (path: string, props?: EventProps)    => provider().page(path, props),
  reset:    () => provider().reset(),
  /** Trocar provider quando consentimento mudar */
  reinit:   () => { _provider = null; },
};

// ───── Eventos canônicos (type-safe) ───────────────────────────────────────
export const Events = {
  // Auth
  SIGNUP_STARTED:     "signup_started",
  SIGNUP_COMPLETED:   "signup_completed",
  LOGIN_ATTEMPTED:    "login_attempted",
  LOGIN_SUCCEEDED:    "login_succeeded",
  LOGIN_FAILED:       "login_failed",
  PASSWORD_RESET_REQUESTED: "password_reset_requested",
  EMAIL_VERIFIED:     "email_verified",

  // Demandas
  DEMAND_DRAFT_STARTED: "demand_draft_started",
  DEMAND_CREATED:     "demand_created",
  DEMAND_PUBLISHED:   "demand_published",
  DEMAND_VIEWED:      "demand_viewed",

  // Propostas
  PROPOSAL_SENT:      "proposal_sent",
  PROPOSAL_RECEIVED:  "proposal_received",
  PROPOSAL_VIEWED:    "proposal_viewed",
  PROPOSAL_ACCEPTED:  "proposal_accepted",
  PROPOSAL_REJECTED:  "proposal_rejected",
  PROPOSAL_COUNTERED: "proposal_countered",

  // Pedidos
  ORDER_CREATED:      "order_created",
  ORDER_STATUS_CHANGED: "order_status_changed",
  ORDER_DELIVERED:    "order_delivered",

  // Contratos
  CONTRACT_GENERATED: "contract_generated",
  CONTRACT_SIGNED:    "contract_signed",

  // Pagamentos
  PAYMENT_INITIATED:  "payment_initiated",
  PAYMENT_COMPLETED:  "payment_completed",
  PAYMENT_RELEASED:   "payment_released",
  PAYMENT_REFUNDED:   "payment_refunded",

  // Disputas
  DISPUTE_OPENED:     "dispute_opened",
  DISPUTE_RESOLVED:   "dispute_resolved",

  // KYC
  KYC_SUBMITTED:      "kyc_submitted",
  KYC_APPROVED:       "kyc_approved",
  KYC_REJECTED:       "kyc_rejected",

  // Engagement
  MESSAGE_SENT:       "message_sent",
  FEEDBACK_SUBMITTED: "feedback_submitted",
  HELP_OPENED:        "help_opened",
} as const;

export type EventName = typeof Events[keyof typeof Events];
