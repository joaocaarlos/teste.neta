/**
 * ForgotPasswordPage — standalone forgot-password page.
 * Routes: /forgot, /forgot-password, /auth/forgot-password
 * Inline styles only. TypeScript strict.
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// ─── ForgotPasswordPage ───────────────────────────────────────────────────────

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Informe o e-mail.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        setError("Não foi possível solicitar reset. Tente novamente.");
      }
    } catch {
      setError("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "24px 16px",
        fontFamily: "var(--body)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          padding: "40px 36px",
        }}
      >
        {/* ─── Logo / Title ─────────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              fontFamily: "var(--cond)",
              fontSize: 32,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: ".08em",
              color: "var(--amber)",
              marginBottom: 4,
            }}
          >
            CapaCity
          </div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: "var(--white3)",
              textTransform: "uppercase",
              letterSpacing: ".12em",
            }}
          >
            Acesso seguro
          </div>
        </div>

        {/* ─── Form title ───────────────────────────────────────────────────── */}
        <div
          style={{
            fontFamily: "var(--cond)",
            fontSize: 20,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".04em",
            marginBottom: 18,
          }}
        >
          Recuperar senha
        </div>

        {sent ? (
          /* ─── Success state ─────────────────────────────────────────────── */
          <div>
            <div
              style={{
                padding: "14px 16px",
                background: "rgba(34,197,94,.08)",
                border: "1px solid rgba(34,197,94,.3)",
                color: "var(--green)",
                fontFamily: "var(--mono)",
                fontSize: 11,
                lineHeight: 1.6,
                marginBottom: 20,
              }}
            >
              Confira sua caixa de entrada. O link de redefinição expira em 1 hora.
            </div>
            <button
              type="button"
              onClick={() => navigate("/login")}
              style={{
                width: "100%",
                padding: "12px 0",
                background: "var(--amber)",
                border: "none",
                color: "var(--bg)",
                fontFamily: "var(--cond)",
                fontWeight: 700,
                fontSize: 14,
                textTransform: "uppercase",
                letterSpacing: ".08em",
                cursor: "pointer",
                transition: "background .15s",
              }}
            >
              Ir para login
            </button>
          </div>
        ) : (
          /* ─── Form ──────────────────────────────────────────────────────── */
          <form onSubmit={handleSubmit} noValidate>
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="forgot-email"
                style={{
                  display: "block",
                  fontFamily: "var(--mono)",
                  fontSize: "10px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--white2)",
                  marginBottom: 6,
                }}
              >
                E-mail da conta
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                disabled={loading}
                style={{
                  background: "var(--bg3)",
                  border: "1px solid var(--border)",
                  color: "var(--white)",
                  fontFamily: "var(--body)",
                  fontSize: 14,
                  padding: "10px 14px",
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                  borderRadius: 0,
                }}
              />
            </div>

            {/* ─── Error ──────────────────────────────────────────────────── */}
            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "var(--red)22",
                  border: "1px solid var(--red)44",
                  color: "var(--red)",
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  marginBottom: 16,
                }}
              >
                {error}
              </div>
            )}

            {/* ─── Actions ────────────────────────────────────────────────── */}
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "space-between",
                marginTop: 8,
              }}
            >
              <button
                type="button"
                onClick={() => navigate("/login")}
                disabled={loading}
                style={{
                  padding: "10px 18px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--white3)",
                  fontFamily: "var(--cond)",
                  fontWeight: 700,
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "border-color .15s, color .15s",
                }}
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "10px 18px",
                  background: loading ? "var(--border2)" : "var(--amber)",
                  border: "none",
                  color: loading ? "var(--white3)" : "var(--bg)",
                  fontFamily: "var(--cond)",
                  fontWeight: 700,
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "background .15s",
                }}
              >
                {loading ? "Enviando…" : "Enviar link"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
