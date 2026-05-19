/**
 * LoginPage — standalone login page for /login route.
 * Inline styles only. TypeScript strict.
 */

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../app/AuthContext";
import { Input } from "../../components/ui/Input";
import { UserRole } from "../../types";

// ─── Types ────────────────────────────────────────────────────────────────────

type RoleOption = { role: UserRole; label: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_OPTIONS: RoleOption[] = [
  { role: "demandante", label: "Sou demandante" },
  { role: "fornecedor", label: "Sou fornecedor" },
];

// ─── LoginPage ────────────────────────────────────────────────────────────────

export function LoginPage() {
  const { login, loginErr, loginLoading } = useAuth();

  const [role, setRole] = useState<UserRole>("demandante");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!email.trim()) {
      setLocalError("Informe o e-mail.");
      return;
    }
    if (!password) {
      setLocalError("Informe a senha.");
      return;
    }

    const result = await login(email.trim(), password, role);
    if (result === true) {
      window.location.href = "/dashboard";
    }
  };

  const displayError = localError || loginErr;

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
        {/* ─── Logo / Title ───────────────────────────────────────────────── */}
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
            Plataforma industrial
          </div>
        </div>

        {/* ─── Role selector ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 9,
              color: "var(--white3)",
              textTransform: "uppercase",
              letterSpacing: ".12em",
              marginBottom: 8,
            }}
          >
            Tipo de conta
          </div>
          <div
            style={{
              display: "flex",
              gap: 0,
              border: "1px solid var(--border)",
            }}
          >
            {ROLE_OPTIONS.map(({ role: r, label }) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  background: role === r ? "var(--amber)" : "transparent",
                  border: "none",
                  borderRight: r === "demandante" ? "1px solid var(--border)" : "none",
                  color: role === r ? "var(--bg)" : "var(--white2)",
                  fontFamily: "var(--cond)",
                  fontWeight: 700,
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  cursor: "pointer",
                  transition: "background .15s, color .15s",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Form ───────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} noValidate>
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            autoComplete="email"
            disabled={loginLoading}
          />

          {/* Password with show/hide toggle */}
          <div style={{ marginBottom: 16 }}>
            <label
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
              Senha
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loginLoading}
                style={{
                  background: "var(--bg3)",
                  border: "1px solid var(--border)",
                  color: "var(--white)",
                  fontFamily: "var(--body)",
                  fontSize: 14,
                  padding: "10px 42px 10px 14px",
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                  borderRadius: 0,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "var(--white3)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* ─── Error ──────────────────────────────────────────────────── */}
          {displayError && (
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
              {displayError}
            </div>
          )}

          {/* ─── Submit ─────────────────────────────────────────────────── */}
          <button
            type="submit"
            disabled={loginLoading}
            style={{
              width: "100%",
              padding: "12px 0",
              background: loginLoading ? "var(--border2)" : "var(--amber)",
              border: "none",
              color: loginLoading ? "var(--white3)" : "var(--bg)",
              fontFamily: "var(--cond)",
              fontWeight: 700,
              fontSize: 14,
              textTransform: "uppercase",
              letterSpacing: ".08em",
              cursor: loginLoading ? "not-allowed" : "pointer",
              transition: "background .15s",
            }}
          >
            {loginLoading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        {/* ─── Links ──────────────────────────────────────────────────────── */}
        <div
          style={{
            marginTop: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <a
            href="/forgot-password"
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: "var(--white3)",
              textDecoration: "none",
              textTransform: "uppercase",
              letterSpacing: ".06em",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = "var(--amber)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = "var(--white3)";
            }}
          >
            Esqueceu a senha?
          </a>
          <a
            href="/cadastro"
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: "var(--white3)",
              textDecoration: "none",
              textTransform: "uppercase",
              letterSpacing: ".06em",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = "var(--amber)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = "var(--white3)";
            }}
          >
            Criar conta
          </a>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
