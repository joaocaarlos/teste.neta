import { Home, ArrowLeft, LayoutDashboard, ClipboardList, Package, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "../../app/AuthContext";

interface NotFoundPageProps {
  onHome?: () => void;
  onBack?: () => void;
}

/**
 * Página 404 customizada com branding CapaCity.
 * Mostra links contextuais dependendo se o usuário está autenticado ou não.
 */
export function NotFoundPage({ onHome, onBack }: NotFoundPageProps) {
  const { user } = useAuth();

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
          maxWidth: 520,
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
              maxWidth: 400,
              margin: "0 auto",
            }}
          >
            {user
              ? "Esta página não existe ou você não tem permissão para acessá-la. Use os atalhos abaixo para continuar navegando."
              : "O endereço que você acessou não existe ou foi movido. Verifique a URL ou acesse a página inicial."}
          </div>
        </div>

        {/* Contextual quick links */}
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "center",
            marginTop: 8,
          }}
        >
          {onBack && (
            <button
              onClick={onBack}
              style={{
                padding: "10px 18px",
                background: "transparent",
                color: "var(--white)",
                border: "1px solid var(--border2)",
                fontFamily: "var(--cond)",
                fontWeight: 700,
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: ".08em",
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
              }}
            >
              <ArrowLeft size={14} aria-hidden="true" />
              Voltar
            </button>
          )}

          {user ? (
            <>
              <button
                onClick={() => { window.location.href = "/dashboard"; }}
                style={{
                  padding: "10px 18px",
                  background: "var(--amber)",
                  color: "var(--bg)",
                  border: "none",
                  fontFamily: "var(--cond)",
                  fontWeight: 700,
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                <LayoutDashboard size={14} aria-hidden="true" />
                Dashboard
              </button>
              <button
                onClick={() => { window.location.href = "/demandas"; }}
                style={{
                  padding: "10px 18px",
                  background: "transparent",
                  color: "var(--white2)",
                  border: "1px solid var(--border2)",
                  fontFamily: "var(--cond)",
                  fontWeight: 700,
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                <ClipboardList size={14} aria-hidden="true" />
                Demandas
              </button>
              <button
                onClick={() => { window.location.href = "/pedidos"; }}
                style={{
                  padding: "10px 18px",
                  background: "transparent",
                  color: "var(--white2)",
                  border: "1px solid var(--border2)",
                  fontFamily: "var(--cond)",
                  fontWeight: 700,
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                <Package size={14} aria-hidden="true" />
                Pedidos
              </button>
            </>
          ) : (
            <>
              {onHome ? (
                <button
                  onClick={onHome}
                  style={{
                    padding: "10px 18px",
                    background: "var(--amber)",
                    color: "var(--bg)",
                    border: "none",
                    fontFamily: "var(--cond)",
                    fontWeight: 700,
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                  }}
                >
                  <Home size={14} aria-hidden="true" />
                  Página inicial
                </button>
              ) : (
                <button
                  onClick={() => { window.location.href = "/"; }}
                  style={{
                    padding: "10px 18px",
                    background: "var(--amber)",
                    color: "var(--bg)",
                    border: "none",
                    fontFamily: "var(--cond)",
                    fontWeight: 700,
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                  }}
                >
                  <Home size={14} aria-hidden="true" />
                  Página inicial
                </button>
              )}
              <button
                onClick={() => { window.location.href = "/login"; }}
                style={{
                  padding: "10px 18px",
                  background: "transparent",
                  color: "var(--white2)",
                  border: "1px solid var(--border2)",
                  fontFamily: "var(--cond)",
                  fontWeight: 700,
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                <LogIn size={14} aria-hidden="true" />
                Entrar
              </button>
              <button
                onClick={() => { window.location.href = "/cadastro"; }}
                style={{
                  padding: "10px 18px",
                  background: "transparent",
                  color: "var(--white2)",
                  border: "1px solid var(--border2)",
                  fontFamily: "var(--cond)",
                  fontWeight: 700,
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                <UserPlus size={14} aria-hidden="true" />
                Cadastrar
              </button>
            </>
          )}
        </div>

        <div
          style={{
            marginTop: 24,
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
