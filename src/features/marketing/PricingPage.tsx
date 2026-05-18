import { Check, X, Zap } from "lucide-react";

interface PricingPageProps {
  onCTA: () => void;
}

const TIERS = [
  {
    name: "Demandante",
    tagline: "Para empresas que terceirizam produção",
    price: "Grátis",
    priceNote: "Pague apenas pela transação",
    cta: "Começar grátis",
    highlight: false,
    features: [
      { text: "Publicar demandas ilimitadas", included: true },
      { text: "Receber propostas de fornecedores verificados", included: true },
      { text: "Contratos digitais com assinatura", included: true },
      { text: "Pagamento protegido em escrow", included: true },
      { text: "Suporte por e-mail", included: true },
      { text: "Mediação de disputas", included: true },
      { text: "Comissão de 3% por transação concluída", included: true, note: "deduzida do pagamento" },
    ],
  },
  {
    name: "Fornecedor",
    tagline: "Para fábricas com capacidade ociosa",
    price: "Grátis",
    priceNote: "5% de comissão por venda",
    cta: "Cadastrar minha fábrica",
    highlight: true,
    features: [
      { text: "Receber demandas qualificadas", included: true },
      { text: "Enviar propostas ilimitadas", included: true },
      { text: "Perfil público com SEO", included: true },
      { text: "Templates de proposta reutilizáveis", included: true },
      { text: "Calendário de capacidade integrado", included: true },
      { text: "Repasse automático via Stripe Connect", included: true },
      { text: "Comissão de 5% por venda concluída", included: true, note: "deduzida do recebimento" },
    ],
  },
  {
    name: "Enterprise",
    tagline: "Para grupos com >100 fornecedores",
    price: "Customizado",
    priceNote: "Fale com vendas",
    cta: "Falar com vendas",
    highlight: false,
    features: [
      { text: "SSO (SAML / OIDC)", included: true },
      { text: "API dedicada com SLA", included: true },
      { text: "Onboarding assistido", included: true },
      { text: "Comissão negociada (volume)", included: true },
      { text: "Gerente de conta dedicado", included: true },
      { text: "Relatórios customizados", included: true },
      { text: "Contrato master multi-empresa", included: true },
    ],
  },
];

const FAQ = [
  {
    q: "Quando a comissão é cobrada?",
    a: "Apenas quando o pedido é concluído e o pagamento liberado. Não há mensalidade nem taxa de cadastro.",
  },
  {
    q: "Como funciona o pagamento protegido?",
    a: "O demandante paga antes da produção começar; o valor fica retido (escrow). Quando o produto é entregue e aceito, liberamos o pagamento para o fornecedor. Em caso de disputa, mediamos a resolução.",
  },
  {
    q: "Quem paga a comissão?",
    a: "Ambos os lados contribuem: 3% do demandante + 5% do fornecedor. Não há cobrança duplicada.",
  },
  {
    q: "Posso cancelar a qualquer momento?",
    a: "Sim. Sem fidelidade, sem multa. Você só paga quando há transação concluída.",
  },
  {
    q: "Vocês emitem nota fiscal?",
    a: "Sim, emitimos NF-e da comissão automaticamente após cada transação.",
  },
];

export function PricingPage({ onCTA }: PricingPageProps) {
  return (
    <main id="main-content" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <section style={{ padding: "80px 24px 40px", textAlign: "center" }}>
        <h1
          style={{
            fontFamily: "var(--cond)",
            fontSize: "clamp(36px, 6vw, 64px)",
            fontWeight: 900,
            letterSpacing: ".04em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          Preços <span style={{ color: "var(--amber)" }}>simples</span>
        </h1>
        <p
          style={{
            fontFamily: "var(--body)",
            fontSize: 17,
            color: "var(--white2)",
            maxWidth: 600,
            margin: "0 auto",
            lineHeight: 1.6,
          }}
        >
          Sem mensalidade. Sem taxa de cadastro. Você paga apenas quando fecha negócio.
        </p>
      </section>

      <section
        style={{
          padding: "0 24px 80px",
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 24,
        }}
      >
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            style={{
              background: tier.highlight
                ? "linear-gradient(135deg, var(--bg2), var(--amber-dim))"
                : "var(--bg2)",
              border: tier.highlight ? "2px solid var(--amber)" : "1px solid var(--border)",
              padding: 32,
              display: "flex",
              flexDirection: "column",
              gap: 24,
              position: "relative",
            }}
          >
            {tier.highlight && (
              <div
                style={{
                  position: "absolute",
                  top: -1,
                  right: -1,
                  background: "var(--amber)",
                  color: "var(--bg)",
                  padding: "6px 12px",
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  display: "flex",
                  gap: 4,
                  alignItems: "center",
                }}
              >
                <Zap size={12} /> Mais popular
              </div>
            )}

            <div>
              <div
                style={{
                  fontFamily: "var(--cond)",
                  fontSize: 22,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                  marginBottom: 4,
                }}
              >
                {tier.name}
              </div>
              <div
                style={{
                  fontFamily: "var(--body)",
                  fontSize: 13,
                  color: "var(--white2)",
                }}
              >
                {tier.tagline}
              </div>
            </div>

            <div>
              <div
                style={{
                  fontFamily: "var(--cond)",
                  fontSize: 40,
                  fontWeight: 900,
                  color: "var(--amber)",
                  lineHeight: 1,
                }}
              >
                {tier.price}
              </div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  color: "var(--white3)",
                  marginTop: 6,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                }}
              >
                {tier.priceNote}
              </div>
            </div>

            <button
              onClick={onCTA}
              style={{
                padding: "14px 22px",
                background: tier.highlight ? "var(--amber)" : "transparent",
                color: tier.highlight ? "var(--bg)" : "var(--white)",
                border: tier.highlight ? "none" : "1px solid var(--border2)",
                fontFamily: "var(--cond)",
                fontWeight: 700,
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: ".08em",
                cursor: "pointer",
              }}
            >
              {tier.cta}
            </button>

            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {tier.features.map((f, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    fontFamily: "var(--body)",
                    fontSize: 13,
                    color: "var(--white)",
                    lineHeight: 1.5,
                  }}
                >
                  {f.included ? (
                    <Check size={16} style={{ color: "var(--green)", flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                  ) : (
                    <X size={16} style={{ color: "var(--red)", flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                  )}
                  <span>
                    {f.text}
                    {f.note && (
                      <span style={{ display: "block", fontSize: 11, color: "var(--white3)" }}>
                        {f.note}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section style={{ padding: "60px 24px 100px", maxWidth: 760, margin: "0 auto" }}>
        <h2
          style={{
            fontFamily: "var(--cond)",
            fontSize: 32,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: ".04em",
            marginBottom: 32,
            textAlign: "center",
          }}
        >
          Perguntas <span style={{ color: "var(--amber)" }}>frequentes</span>
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {FAQ.map((item, i) => (
            <details
              key={i}
              style={{
                background: "var(--bg2)",
                border: "1px solid var(--border)",
                padding: 20,
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  fontFamily: "var(--cond)",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--white)",
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                }}
              >
                {item.q}
              </summary>
              <p
                style={{
                  marginTop: 12,
                  fontFamily: "var(--body)",
                  fontSize: 14,
                  color: "var(--white2)",
                  lineHeight: 1.6,
                }}
              >
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
