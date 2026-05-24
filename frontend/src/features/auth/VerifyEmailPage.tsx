/**
 * VerifyEmailPage — standalone email verification page.
 * Routes: /verify-email, /auth/verify-email
 * Reads ?token= from URL, auto-submits on mount. Inline styles only. TypeScript strict.
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────

type VerifyStatus = "validando" | "ok" | "erro";

// ─── VerifyEmailPage ──────────────────────────────────────────────────────────

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<VerifyStatus>("validando");

  useEffect(() => {
    if (!token) {
      setStatus("erro");
      return;
    }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
      credentials: "include",
    })
      .then((r) => setStatus(r.ok ? "ok" : "erro"))
      .catch(() => setStatus("erro"));
  }, [token]);

  const statusConfig: Record<
    VerifyStatus,
    { message: string; color: string; bg: string; border: string }
  > = {
    validando: {
      message: "Validando seu link…",
      color: "var(--white2)",
      bg: "var(--bg3)",
      border: "var(--border)",
    },
    ok: {
      message: "E-mail confirmado com sucesso. Você já pode entrar na plataforma.",
      color: "var(--green)",
      bg: "rgba(34,197,94,.08)",
      border: "rgba(34,197,94,.3)",
    },
    erro: {
      message: "Link inválido ou expirado. Solicite um novo link de verificação.",
      color: "var(--red)",
      bg: "var(--red)11",
      border: "var(--red)33",
    },
  };

  const current = statusConfig[status];

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
            Confirmação da conta
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
          Verificação de e-mail
        </div>

        {/* ─── Status message ───────────────────────────────────────────────── */}
        <div
          style={{
            padding: "14px 16px",
            background: current.bg,
            border: `1px solid ${current.border}`,
            color: current.color,
            fontFamily: "var(--mono)",
            fontSize: 11,
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          {status === "validando" && (
            <span
              style={{
                display: "inline-block",
                marginRight: 8,
                animation: "spin 1s linear infinite",
              }}
            >
              ⟳
            </span>
          )}
          {current.message}
        </div>

        {/* ─── Action button ────────────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => navigate("/login")}
            disabled={status === "validando"}
            style={{
              padding: "10px 24px",
              background: status === "validando" ? "var(--border2)" : "var(--amber)",
              border: "none",
              color: status === "validando" ? "var(--white3)" : "var(--bg)",
              fontFamily: "var(--cond)",
              fontWeight: 700,
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: ".08em",
              cursor: status === "validando" ? "not-allowed" : "pointer",
              transition: "background .15s",
            }}
          >
            Entrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmailPage;
