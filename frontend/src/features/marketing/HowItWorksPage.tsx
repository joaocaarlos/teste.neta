import { ClipboardList, Send, FileSignature, CreditCard, Package, Star } from "lucide-react";

const STEPS = [
  {
    icon: ClipboardList,
    title: "1. Publique sua demanda",
    description: "Descreva o que você precisa produzir: processo, quantidade, prazo, materiais. Anexe desenhos técnicos.",
    role: "Demandante",
  },
  {
    icon: Send,
    title: "2. Receba propostas",
    description: "Fornecedores verificados enviam propostas com preço, prazo, certificações e portfólio. Compare lado a lado.",
    role: "Demandante",
  },
  {
    icon: FileSignature,
    title: "3. Assine o contrato",
    description: "Aceite a melhor proposta. Geramos o contrato automaticamente. Ambas as partes assinam digitalmente.",
    role: "Ambos",
  },
  {
    icon: CreditCard,
    title: "4. Pagamento protegido",
    description: "O demandante paga via Stripe. O valor fica retido em escrow até a entrega ser aceita.",
    role: "Ambos",
  },
  {
    icon: Package,
    title: "5. Produção e entrega",
    description: "O fornecedor produz e envia. Acompanhe o progresso pelo timeline. Anexe fotos, notas e atualizações.",
    role: "Fornecedor",
  },
  {
    icon: Star,
    title: "6. Conclusão e avaliação",
    description: "Após o recebimento, o pagamento é liberado. Avalie a entrega. Ambas as partes ganham reputação para futuros negócios.",
    role: "Ambos",
  },
];

const FEATURES = [
  "KYC obrigatório para fornecedores",
  "NDA digital antes de compartilhar projetos",
  "Mediação de disputas em até 48h",
  "Suporte humano por chat e e-mail",
  "Trilha de auditoria completa",
  "Conformidade LGPD",
];

export function HowItWorksPage() {
  return (
    <main id="main-content" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Hero */}
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
          Como <span style={{ color: "var(--amber)" }}>funciona</span>
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
          Da publicação da demanda ao pagamento liberado — em até 30 dias, com tudo registrado.
        </p>
      </section>

      {/* Steps */}
      <section
        style={{
          padding: "40px 24px 60px",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <ol
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <li
                key={i}
                style={{
                  background: "var(--bg2)",
                  border: "1px solid var(--border)",
                  padding: 28,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    background: "var(--bg3)",
                    color: "var(--white3)",
                    padding: "3px 8px",
                    fontFamily: "var(--mono)",
                    fontSize: 9,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                  }}
                >
                  {step.role}
                </div>

                <div
                  style={{
                    width: 56,
                    height: 56,
                    background: "var(--amber-dim)",
                    color: "var(--amber)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  aria-hidden="true"
                >
                  <Icon size={28} />
                </div>

                <div
                  style={{
                    fontFamily: "var(--cond)",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--white)",
                    textTransform: "uppercase",
                    letterSpacing: ".04em",
                  }}
                >
                  {step.title}
                </div>

                <p
                  style={{
                    fontFamily: "var(--body)",
                    fontSize: 13,
                    color: "var(--white2)",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {step.description}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Garantias */}
      <section style={{ padding: "60px 24px 80px", maxWidth: 900, margin: "0 auto" }}>
        <h2
          style={{
            fontFamily: "var(--cond)",
            fontSize: 28,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: ".04em",
            marginBottom: 32,
            textAlign: "center",
          }}
        >
          O que nós <span style={{ color: "var(--amber)" }}>garantimos</span>
        </h2>

        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          {FEATURES.map((f, i) => (
            <li
              key={i}
              style={{
                background: "var(--bg2)",
                border: "1px solid var(--border)",
                padding: "16px 20px",
                fontFamily: "var(--body)",
                fontSize: 13,
                color: "var(--white)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--amber)",
                }}
              />
              {f}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
