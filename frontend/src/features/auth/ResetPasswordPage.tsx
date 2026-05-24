/**
 * ResetPasswordPage — standalone reset-password page.
 * Routes: /reset-password, /auth/reset-password
 * Reads ?token= from URL. Inline styles only. TypeScript strict.
 */

import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

// ─── ResetPasswordPage ────────────────────────────────────────────────────────

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [form, setForm] = useState({ password: "", confirm: "" });
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Link inválido. Solicite um novo link de redefinição.");
      return;
    }
    if (form.password.length < 8) {
      setError("Senha deve ter ao menos 8 caracteres.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Senhas não conferem.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: form.password }),
      });

      if (res.ok) {
        setDone(true);
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error || "Link inválido ou expirado.");
      }
    } catch {
      setError("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
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
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontFamily: "var(--mono)",
    fontSize: "10px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "var(--white2)",
    marginBottom: 6,
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
            Redefinição de acesso
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
          Nova senha
        </div>

        {done ? (
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
              Sua senha foi atualizada. Você já pode entrar novamente.
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
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="reset-password" style={labelStyle}>Nova senha</label>
              <input
                id="reset-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={loading}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label htmlFor="reset-confirm" style={labelStyle}>Confirmar senha</label>
              <input
                id="reset-confirm"
                type="password"
                value={form.confirm}
                onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={loading}
                style={inputStyle}
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
                Ir para login
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
                {loading ? "Redefinindo…" : "Redefinir"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPasswordPage;
