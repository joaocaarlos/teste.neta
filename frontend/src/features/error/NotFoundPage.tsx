import { Home, ArrowLeft } from "lucide-react";

interface NotFoundPageProps {
  onHome?: () => void;
  onBack?: () => void;
}

/**
 * Página 404 customizada com branding CapaCity.
 */
export function NotFoundPage({ onHome, onBack }: NotFoundPageProps) {
  return (
    <main
      role="main"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            fontFamily: "var(--cond)",
            fontSize: 140,
            fontWeight: 900,
            letterSpacing: ".06em",
            color: "var(--amber)",
            lineHeight: 1,
          }}
        >
          404
        </div>

        <div>
          <div
            style={{
              fontFamily: "var(--cond)",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: ".04em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Página não encontrada
          </div>

          <div
            style={{
              fontFamily: "var(--body)",
              fontSize: 14,
              color: "var(--white2)",
              lineHeight: 1.6,
              maxWidth: 360,
              margin: "0 auto",
            }}
          >
            O endereço que você acessou não existe ou foi movido.
            Verifique a URL ou volte para a página inicial.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "center",
            marginTop: 12,
          }}
        >
          {onBack && (
            <button
              onClick={onBack}
              style={{
                padding: "12px 22px",
                background: "transparent",
                color: "var(--white)",
                border: "1px solid var(--border2)",
                fontFamily: "var(--cond)",
                fontWeight: 700,
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: ".08em",
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Voltar
            </button>
          )}

          {onHome && (
            <button
              onClick={onHome}
              style={{
                padding: "12px 22px",
                background: "var(--amber)",
                color: "var(--bg)",
                border: "none",
                fontFamily: "var(--cond)",
                fontWeight: 700,
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: ".08em",
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <Home size={16} aria-hidden="true" />
              Página inicial
            </button>
          )}
        </div>

        <div
          style={{
            marginTop: 32,
            paddingTop: 24,
            borderTop: "1px solid var(--border)",
            fontFamily: "var(--mono)",
            fontSize: 10,
            color: "var(--white3)",
            letterSpacing: ".15em",
            textTransform: "uppercase",
          }}
        >
          CapaCity — Marketplace Industrial B2B
        </div>
      </div>
    </main>
  );
}
