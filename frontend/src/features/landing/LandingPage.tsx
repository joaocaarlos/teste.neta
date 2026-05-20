/**
 * LandingPage — public marketing/home page for CapaCity.
 * Redirects authenticated users directly to /dashboard.
 * Inline styles only. TypeScript strict.
 */

import { useEffect, useState } from "react";
import { useAuth } from "../../app/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StepItem {
  n: string;
  icon: string;
  title: string;
  description: string;
}

interface SegmentItem {
  icon: string;
  title: string;
  description: string;
}

interface FaqItem {
  q: string;
  a: string;
}

interface StatItem {
  value: string;
  label: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS: StepItem[] = [
  {
    n: "01",
    icon: "📋",
    title: "Publique sua demanda",
    description:
      "Descreva o processo, quantidade, material e prazo. Ative NDA se necessário. Em menos de 2 minutos.",
  },
  {
    n: "02",
    icon: "⚡",
    title: "Receba propostas",
    description:
      "O algoritmo notifica fábricas compatíveis. Propostas chegam em até 34h com score automático de 0–100.",
  },
  {
    n: "03",
    icon: "📊",
    title: "Compare e escolha",
    description:
      "Compare preço, prazo, score de risco e avaliações históricas lado a lado. Aceite com um clique.",
  },
  {
    n: "04",
    icon: "🏭",
    title: "Produza com segurança",
    description:
      "Contrato digital, NDA assinado e pagamento em escrow. Acompanhe a produção em tempo real.",
  },
];

const SEGMENTS: SegmentItem[] = [
  {
    icon: "⚙️",
    title: "Usinagem CNC",
    description:
      "Torneamento, fresamento, furação, roscamento e acabamento de precisão.",
  },
  {
    icon: "💉",
    title: "Injeção Plástica",
    description:
      "Moldagem por injeção, extrusão, sopro e termoformagem de termoplásticos.",
  },
  {
    icon: "👕",
    title: "Confecção Têxtil",
    description:
      "Corte e costura, bordado, estamparia e acabamento para moda e uniformes.",
  },
  {
    icon: "🔥",
    title: "Caldeiraria",
    description:
      "Fabricação de vasos de pressão, trocadores de calor, tanques e estruturas.",
  },
  {
    icon: "⚡",
    title: "Montagem Eletrônica",
    description:
      "PCB, SMD, solda seletiva, chicotes elétricos e montagem de painéis.",
  },
  {
    icon: "🌡️",
    title: "Tratamento Térmico",
    description:
      "Têmpera, revenimento, cementação, nitretação e tratamentos de superfície.",
  },
  {
    icon: "🏗️",
    title: "Fundição",
    description:
      "Fundição em areia, cera perdida, gravitacional e sob pressão em metais ferrosos.",
  },
  {
    icon: "🖨️",
    title: "Impressão 3D",
    description:
      "FDM, SLA, SLS e DMLS para prototipagem rápida e produção de pequenos volumes.",
  },
];

const STATS: StatItem[] = [
  { value: "2.400+", label: "Fábricas verificadas" },
  { value: "R$780M", label: "Capacidade negociada" },
  { value: "98%", label: "Entregas no prazo" },
  { value: "34h", label: "Tempo p/ proposta" },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    q: "Como a plataforma seleciona fornecedores?",
    a: "O sistema calcula automaticamente um score de 0 a 100 baseado em 7 critérios ponderados: processo compatível (25%), capacidade disponível (20%), localização (15%), certificação (15%), avaliação histórica (10%), prazo (10%) e preço médio (5%).",
  },
  {
    q: "Como funciona a verificação das empresas?",
    a: "Toda empresa enviará contrato social, alvará, comprovante de CNPJ e certificações. Um administrador valida manualmente cada documento antes de ativar o perfil, com selo de empresa verificada no perfil público.",
  },
  {
    q: "É possível exigir NDA antes do fornecedor ver os arquivos?",
    a: "Sim. O demandante ativa o NDA na criação da demanda. Os arquivos ficam bloqueados até o fornecedor assinar eletronicamente. O sistema registra IP, data/hora e aplica marca d'água nos downloads.",
  },
  {
    q: "Como funciona o pagamento protegido?",
    a: "O valor fica retido em escrow na plataforma. O fornecedor produz e entrega. Após aprovação do pedido pelo demandante, a plataforma libera o valor e retém a comissão.",
  },
  {
    q: "Posso publicar demanda recorrente?",
    a: "Sim. O módulo de Contratos Recorrentes permite criar contratos mensais, por volume, capacidade reservada ou emergencial, com SLA, renovação automática e histórico de volumes.",
  },
];

// ─── LandingPage ──────────────────────────────────────────────────────────────

export function LandingPage() {
  const { user, authLoading } = useAuth();
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!authLoading && user) {
      window.location.href = "/dashboard";
    }
  }, [user, authLoading]);

  // While checking auth, show nothing to avoid flash
  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: "var(--white3)",
            letterSpacing: ".12em",
            textTransform: "uppercase",
          }}
        >
          Carregando…
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* ─── Nav ──────────────────────────────────────────────────────────── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 5%",
          background: "rgba(7,7,8,.9)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--cond)",
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: ".06em",
          }}
        >
          CAP<span style={{ color: "var(--amber)" }}>A</span>CITY
        </span>

        <div style={{ display: "flex", gap: 28 }}>
          {[
            ["Como funciona", "#como-funciona"],
            ["Segmentos", "#segmentos"],
            ["Preços", "#precos"],
            ["FAQ", "#faq"],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "var(--white2)",
                cursor: "pointer",
                textDecoration: "none",
              }}
              onClick={(e) => {
                e.preventDefault();
                document
                  .querySelector(href)
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {label}
            </a>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <a
            href="/login"
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: "var(--white2)",
              textDecoration: "none",
              padding: "8px 16px",
              border: "1px solid var(--border2)",
              transition: "color .2s, border-color .2s",
            }}
          >
            Entrar
          </a>
          <a
            href="/precos"
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: "var(--bg)",
              textDecoration: "none",
              padding: "8px 16px",
              background: "var(--amber)",
            }}
          >
            Ver Planos
          </a>
        </div>
      </nav>

      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "100px 5% 60px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: ".18em",
            textTransform: "uppercase",
            color: "var(--amber)",
            border: "1px solid rgba(232,160,32,.3)",
            padding: "5px 12px",
            marginBottom: 28,
            width: "fit-content",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--amber)",
              display: "block",
            }}
          />{" "}
          Marketplace Industrial B2B — Acesso Antecipado
        </div>

        <h1
          style={{
            fontFamily: "var(--cond)",
            fontWeight: 900,
            fontSize: "clamp(64px,10vw,136px)",
            lineHeight: 0.9,
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          MANUFATURA
          <br />
          <span
            style={{ WebkitTextStroke: "1px var(--white)", color: "transparent" }}
          >
            DISTRIBUÍDA
          </span>
          <br />
          <span style={{ color: "var(--amber)" }}>POR DEMANDA</span>
        </h1>

        <p
          style={{
            fontFamily: "var(--body)",
            fontSize: 17,
            fontWeight: 300,
            color: "var(--white2)",
            maxWidth: 520,
            lineHeight: 1.65,
            marginBottom: 36,
          }}
        >
          Conectamos fábricas com capacidade ociosa a empresas com pico de
          demanda. O{" "}
          <strong style={{ color: "var(--white)" }}>Airbnb industrial</strong>{" "}
          com matching inteligente, NDA digital e pagamento protegido.
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 56,
            flexWrap: "wrap",
          }}
        >
          <a
            href="/login"
            style={{
              fontFamily: "var(--mono)",
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: ".12em",
              textTransform: "uppercase",
              background: "var(--amber)",
              color: "var(--bg)",
              border: "1px solid var(--amber)",
              padding: "16px 36px",
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            Tenho demanda produtiva →
          </a>
          <a
            href="/como-funciona"
            style={{
              fontFamily: "var(--mono)",
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: ".12em",
              textTransform: "uppercase",
              background: "transparent",
              color: "var(--white2)",
              border: "1px solid rgba(255,255,255,.15)",
              padding: "16px 36px",
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            Como Funciona
          </a>
        </div>

        {/* Stats grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            border: "1px solid var(--border)",
            maxWidth: 720,
          }}
        >
          {STATS.map((stat) => (
            <div
              key={stat.label}
              style={{
                padding: "20px 24px",
                background: "var(--bg2)",
                borderRight: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--cond)",
                  fontSize: 36,
                  fontWeight: 800,
                  color: "var(--amber)",
                  lineHeight: 1,
                  marginBottom: 4,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 9,
                  color: "var(--white3)",
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Como Funciona ────────────────────────────────────────────────── */}
      <section
        id="como-funciona"
        style={{
          padding: "80px 5%",
          position: "relative",
          zIndex: 1,
          borderTop: "1px solid var(--border)",
        }}
      >
        <div style={{ marginBottom: 36 }}>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: ".18em",
              textTransform: "uppercase",
              color: "var(--amber)",
              marginBottom: 8,
            }}
          >
            Processo
          </div>
          <h2
            style={{
              fontFamily: "var(--cond)",
              fontSize: "clamp(32px,5vw,56px)",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: ".04em",
              margin: 0,
            }}
          >
            COMO{" "}
            <span style={{ color: "var(--amber)" }}>FUNCIONA</span>
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 0,
            border: "1px solid var(--border)",
            maxWidth: 960,
          }}
        >
          {STEPS.map((step, i) => (
            <div
              key={step.n}
              style={{
                padding: "32px 28px",
                borderRight:
                  i < STEPS.length - 1 ? "1px solid var(--border)" : "none",
                background: "var(--bg2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--cond)",
                    fontSize: 36,
                    fontWeight: 900,
                    color: "var(--amber)",
                    lineHeight: 1,
                  }}
                >
                  {step.n}
                </span>
                <span style={{ fontSize: 22 }}>{step.icon}</span>
              </div>
              <div
                style={{
                  fontFamily: "var(--cond)",
                  fontSize: 16,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".03em",
                  marginBottom: 10,
                }}
              >
                {step.title}
              </div>
              <div
                style={{
                  fontFamily: "var(--body)",
                  fontSize: 13,
                  fontWeight: 300,
                  color: "var(--white2)",
                  lineHeight: 1.65,
                }}
              >
                {step.description}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Segmentos ────────────────────────────────────────────────────── */}
      <section
        id="segmentos"
        style={{
          padding: "80px 5%",
          position: "relative",
          zIndex: 1,
          borderTop: "1px solid var(--border)",
        }}
      >
        <div style={{ marginBottom: 36 }}>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: ".18em",
              textTransform: "uppercase",
              color: "var(--amber)",
              marginBottom: 8,
            }}
          >
            Mercado
          </div>
          <h2
            style={{
              fontFamily: "var(--cond)",
              fontSize: "clamp(32px,5vw,56px)",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: ".04em",
              margin: 0,
            }}
          >
            SEGMENTOS{" "}
            <span style={{ color: "var(--amber)" }}>INDUSTRIAIS</span>
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          {SEGMENTS.map((seg) => (
            <div
              key={seg.title}
              style={{
                padding: 24,
                background: "var(--bg2)",
                border: "1px solid var(--border)",
                transition: "border-color .2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "rgba(232,160,32,.4)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "var(--border)";
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>{seg.icon}</div>
              <div
                style={{
                  fontFamily: "var(--cond)",
                  fontSize: 16,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".03em",
                  marginBottom: 8,
                }}
              >
                {seg.title}
              </div>
              <div
                style={{
                  fontFamily: "var(--body)",
                  fontSize: 12,
                  fontWeight: 300,
                  color: "var(--white2)",
                  lineHeight: 1.6,
                }}
              >
                {seg.description}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Preços CTA ───────────────────────────────────────────────────── */}
      <section
        id="precos"
        style={{
          padding: "80px 5%",
          position: "relative",
          zIndex: 1,
          borderTop: "1px solid var(--border)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: ".18em",
            textTransform: "uppercase",
            color: "var(--amber)",
            marginBottom: 8,
          }}
        >
          Planos
        </div>
        <h2
          style={{
            fontFamily: "var(--cond)",
            fontSize: "clamp(32px,5vw,56px)",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: ".04em",
            marginBottom: 16,
          }}
        >
          PREÇOS{" "}
          <span style={{ color: "var(--amber)" }}>TRANSPARENTES</span>
        </h2>
        <p
          style={{
            fontFamily: "var(--body)",
            fontSize: 16,
            color: "var(--white2)",
            maxWidth: 560,
            margin: "0 auto 32px",
            lineHeight: 1.6,
          }}
        >
          Sem mensalidade. Sem taxa de cadastro. Você paga apenas quando fecha
          negócio. Comissão simples para demandantes e fornecedores.
        </p>
        <a
          href="/precos"
          style={{
            display: "inline-block",
            fontFamily: "var(--mono)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: ".12em",
            textTransform: "uppercase",
            background: "var(--amber)",
            color: "var(--bg)",
            textDecoration: "none",
            padding: "16px 40px",
          }}
        >
          Ver todos os planos →
        </a>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────────────────── */}
      <section
        id="faq"
        style={{
          padding: "60px 5% 80px",
          position: "relative",
          zIndex: 1,
          borderTop: "1px solid var(--border)",
        }}
      >
        <div style={{ marginBottom: 36 }}>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: ".18em",
              textTransform: "uppercase",
              color: "var(--amber)",
              marginBottom: 8,
            }}
          >
            FAQ
          </div>
          <h2
            style={{
              fontFamily: "var(--cond)",
              fontSize: "clamp(32px,5vw,56px)",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: ".04em",
              margin: 0,
            }}
          >
            PERGUNTAS{" "}
            <span style={{ color: "var(--amber)" }}>FREQUENTES</span>
          </h2>
        </div>

        <div style={{ maxWidth: 780 }}>
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} style={{ borderBottom: "1px solid var(--border)" }}>
              <button
                onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "18px 0",
                  background: "transparent",
                  border: "none",
                  color: "var(--white)",
                  textAlign: "left",
                  cursor: "pointer",
                  gap: 16,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--cond)",
                    fontSize: 17,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: ".03em",
                  }}
                >
                  {item.q}
                </span>
                <span
                  style={{
                    flexShrink: 0,
                    color: "var(--amber)",
                    fontFamily: "var(--mono)",
                    fontSize: 16,
                    transition: "transform .2s",
                    display: "inline-block",
                    transform: faqOpen === i ? "rotate(180deg)" : "none",
                  }}
                >
                  ▾
                </span>
              </button>
              {faqOpen === i && (
                <div
                  style={{
                    fontFamily: "var(--body)",
                    fontSize: 14,
                    fontWeight: 300,
                    color: "var(--white2)",
                    lineHeight: 1.65,
                    paddingBottom: 18,
                  }}
                >
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────────────── */}
      <footer
        style={{
          padding: "40px 5% 24px",
          borderTop: "1px solid var(--border)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div
            style={{
              fontFamily: "var(--cond)",
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            CAP<span style={{ color: "var(--amber)" }}>A</span>CITY
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {[
              ["Privacidade", "/privacidade"],
              ["Termos", "/termos"],
              ["Status", "/status"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  color: "var(--white3)",
                  textDecoration: "none",
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                }}
              >
                {label}
              </a>
            ))}
          </div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 9,
              color: "var(--white3)",
            }}
          >
            © 2026 · CAPACITY SISTEMAS LTDA · Feito no Nordeste 🇧🇷
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
