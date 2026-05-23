/**
 * LoginPage — fluxo completo: email/senha, Google OAuth, TOTP (2FA) e 3FA email OTP.
 * Tabs: Demandante · Fornecedor · Admin. Painel de credenciais demo.
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { Eye, EyeOff, ShieldCheck, Mail } from "lucide-react";
import { useAuth } from "../../app/AuthContext";
import { UserRole } from "../../types";
import { DEMO_USERS } from "../../utils/constants";

type Step = "credentials" | "totp" | "3fa";

const ROLE_TABS: { role: UserRole; label: string; icon: string }[] = [
  { role: "demandante", label: "Demandante", icon: "🏭" },
  { role: "fornecedor", label: "Fornecedor",  icon: "⚙️"  },
  { role: "admin",      label: "Admin",       icon: "🛡️"  },
];

export function LoginPage() {
  const navigate  = useNavigate();
  const { login, loginGoogle, verify3fa, resend3fa, loginErr, loginLoading } = useAuth();

  const [step,          setStep]          = useState<Step>("credentials");
  const [role,          setRole]          = useState<UserRole>("demandante");
  const [email,         setEmail]         = useState(DEMO_USERS.demandante.email);
  const [password,      setPassword]      = useState(DEMO_USERS.demandante.password);
  const [showPassword,  setShowPassword]  = useState(false);
  const [totpCode,      setTotpCode]      = useState("");
  const [threeFaCode,   setThreeFaCode]   = useState("");
  const [pendingUserId, setPendingUserId] = useState("");
  const [localError,    setLocalError]    = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const displayError = localError || loginErr;

  // Ao trocar de tab, preenche automaticamente com as credenciais demo
  const handleRoleChange = (r: UserRole) => {
    setRole(r);
    setLocalError("");
    const demo = DEMO_USERS[r as keyof typeof DEMO_USERS];
    if (demo) {
      setEmail(demo.email);
      setPassword(demo.password);
    }
  };

  // ─── Step 1 ───────────────────────────────────────────────────────────────

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    if (!email.trim()) { setLocalError("Informe o e-mail."); return; }
    if (!password)     { setLocalError("Informe a senha."); return; }

    const result = await login(email.trim(), password, role);
    if (result === true) {
      navigate("/dashboard");
    } else if (result === "totp_required") {
      setStep("totp");
    } else if (typeof result === "string" && result.startsWith("3fa_required|")) {
      setPendingUserId(result.split("|")[1]);
      setStep("3fa");
    }
  };

  // ─── Step 2 — TOTP ────────────────────────────────────────────────────────

  const handleTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    if (totpCode.length < 6) { setLocalError("Código deve ter 6 dígitos."); return; }
    const result = await login(email.trim(), password, role, totpCode);
    if (result === true) {
      navigate("/dashboard");
    } else if (typeof result === "string" && result.startsWith("3fa_required|")) {
      setPendingUserId(result.split("|")[1]);
      setStep("3fa");
    }
  };

  // ─── Step 3 — 3FA e-mail OTP ──────────────────────────────────────────────

  const handleThreeFa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    if (threeFaCode.length < 6) { setLocalError("Código deve ter 6 dígitos."); return; }
    const result = await verify3fa(pendingUserId, threeFaCode);
    if (result === true) navigate("/dashboard");
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    await resend3fa(pendingUserId);
    setResendCooldown(60);
    const iv = setInterval(() => {
      setResendCooldown(prev => { if (prev <= 1) { clearInterval(iv); return 0; } return prev - 1; });
    }, 1000);
  };

  // ─── Google OAuth ─────────────────────────────────────────────────────────

  const handleGoogleSuccess = async (cr: { credential?: string }) => {
    if (!cr.credential) return;
    const result = await loginGoogle(cr.credential);
    if (result === true) {
      navigate("/dashboard");
    } else if (typeof result === "string" && result.startsWith("3fa_required|")) {
      setPendingUserId(result.split("|")[1]);
      setStep("3fa");
    }
  };

  // ─── Estilos ──────────────────────────────────────────────────────────────

  const S = {
    page: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
      padding: "24px 16px",
      fontFamily: "var(--body)",
    } as React.CSSProperties,

    card: {
      width: "100%",
      maxWidth: 480,
      background: "var(--bg2)",
      border: "1px solid var(--border)",
      padding: "36px 40px",
    } as React.CSSProperties,

    title: {
      fontFamily: "var(--cond)",
      fontSize: 26,
      fontWeight: 800,
      color: "var(--white)",
      letterSpacing: "0.06em",
      textTransform: "uppercase" as const,
      marginBottom: 4,
    },

    subtitle: {
      fontSize: 12,
      color: "var(--white3)",
      fontFamily: "var(--mono)",
      letterSpacing: "0.06em",
      marginBottom: 24,
    },

    tabRow: {
      display: "flex",
      gap: 0,
      marginBottom: 20,
      border: "1px solid var(--border)",
    } as React.CSSProperties,

    tab: (active: boolean): React.CSSProperties => ({
      flex: 1,
      padding: "12px 4px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 4,
      background: active ? "var(--amber)" : "transparent",
      border: "none",
      borderRight: "1px solid var(--border)",
      color: active ? "var(--bg)" : "var(--white3)",
      fontFamily: "var(--mono)",
      fontSize: 10,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      cursor: "pointer",
      transition: "background .15s, color .15s",
    }),

    demoBox: {
      background: "rgba(34,197,94,0.07)",
      border: "1px solid rgba(34,197,94,0.3)",
      color: "#22c55e",
      fontFamily: "var(--mono)",
      fontSize: 11,
      padding: "10px 14px",
      marginBottom: 18,
      display: "flex",
      flexDirection: "column" as const,
      gap: 2,
    },

    label: {
      display: "block",
      fontFamily: "var(--mono)",
      fontSize: 10,
      letterSpacing: "0.12em",
      textTransform: "uppercase" as const,
      color: "var(--white2)",
      marginBottom: 6,
    },

    input: {
      background: "var(--bg3)",
      border: "1px solid var(--border)",
      color: "var(--white)",
      fontFamily: "var(--body)",
      fontSize: 15,
      padding: "10px 14px",
      outline: "none",
      width: "100%",
      boxSizing: "border-box" as const,
      borderRadius: 0,
      marginBottom: 14,
    },

    btnPrimary: (disabled: boolean): React.CSSProperties => ({
      width: "100%",
      background: disabled ? "var(--border2)" : "var(--amber)",
      color: disabled ? "var(--white3)" : "var(--bg)",
      fontFamily: "var(--cond)",
      fontSize: 14,
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      border: "none",
      padding: "13px",
      cursor: disabled ? "not-allowed" : "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 4,
    }),

    btnGhost: {
      background: "transparent",
      border: "none",
      color: "var(--amber)",
      fontSize: 12,
      cursor: "pointer",
      padding: "4px 0",
      fontFamily: "var(--mono)",
      letterSpacing: "0.04em",
    } as React.CSSProperties,

    error: {
      background: "rgba(239,68,68,0.1)",
      border: "1px solid rgba(239,68,68,0.3)",
      color: "#ef4444",
      padding: "10px 14px",
      fontSize: 12,
      fontFamily: "var(--mono)",
      marginBottom: 14,
    } as React.CSSProperties,

    divider: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      margin: "18px 0",
      color: "var(--white3)",
      fontSize: 11,
      fontFamily: "var(--mono)",
    } as React.CSSProperties,

    line: { flex: 1, height: 1, background: "var(--border)" } as React.CSSProperties,
  };

  const currentDemo = DEMO_USERS[role as keyof typeof DEMO_USERS];

  return (
    <div style={S.page}>
      <div style={S.card}>

        {/* Header */}
        <div style={{ marginBottom: 8 }}>
          {step === "credentials" && (
            <>
              <div style={S.title}>Acessar Plataforma</div>
              <div style={S.subtitle}>Credenciais de demonstração</div>
            </>
          )}
          {step === "totp" && (
            <div style={S.title}>
              <ShieldCheck size={18} style={{ display: "inline", marginRight: 8 }} />
              Verificação 2FA
            </div>
          )}
          {step === "3fa" && (
            <div style={S.title}>
              <Mail size={18} style={{ display: "inline", marginRight: 8 }} />
              Verificação 3FA
            </div>
          )}
        </div>

        {/* Erro */}
        {displayError && <div style={S.error}>{displayError}</div>}

        {/* ─── Step 1: Credenciais ─────────────────────────────────────── */}
        {step === "credentials" && (
          <>
            {/* Tabs de role */}
            <div style={S.tabRow}>
              {ROLE_TABS.map((t, i) => (
                <button
                  key={t.role}
                  type="button"
                  onClick={() => handleRoleChange(t.role)}
                  style={{
                    ...S.tab(role === t.role),
                    borderRight: i < ROLE_TABS.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <span style={{ fontSize: 20 }}>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Painel de credenciais demo */}
            {currentDemo && (
              <div style={S.demoBox}>
                <span style={{ fontWeight: 700, letterSpacing: "0.06em" }}>
                  CREDENCIAIS DEMO PREENCHIDAS
                </span>
                <span>{currentDemo.email} / {currentDemo.password}</span>
              </div>
            )}

            {/* Formulário */}
            <form onSubmit={handleCredentials} noValidate>
              <div>
                <label style={S.label}>E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  disabled={loginLoading}
                  style={S.input}
                />
              </div>

              <div style={{ position: "relative" }}>
                <label style={S.label}>Senha</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loginLoading}
                  style={{ ...S.input, paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: 34,
                    background: "transparent",
                    border: "none",
                    color: "var(--white3)",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                style={S.btnPrimary(loginLoading)}
              >
                {loginLoading ? "Entrando..." : "Entrar na Plataforma →"}
              </button>
            </form>

            {/* Divider + Google */}
            <div style={S.divider}>
              <span style={S.line} /><span>ou</span><span style={S.line} />
            </div>

            <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setLocalError("Falha ao autenticar com Google.")}
                text="signin_with"
                shape="rectangular"
                theme="filled_black"
                width="400"
              />
            </div>

            {/* Links */}
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "var(--white3)" }}>
                Não tem conta?{" "}
                <a href="/cadastro" style={{ color: "var(--amber)", textDecoration: "underline" }}>
                  Cadastre-se
                </a>
              </span>
              <a
                href="/forgot-password"
                style={{ color: "var(--white3)", fontSize: 12, textDecoration: "underline", fontFamily: "var(--mono)" }}
              >
                Esqueci minha senha
              </a>
              <a
                href="/"
                style={{ color: "var(--white3)", fontSize: 11, fontFamily: "var(--mono)", letterSpacing: "0.06em", textDecoration: "none" }}
              >
                ← VOLTAR PARA A LANDING
              </a>
            </div>
          </>
        )}

        {/* ─── Step 2: TOTP ────────────────────────────────────────────── */}
        {step === "totp" && (
          <form onSubmit={handleTotp}>
            <p style={{ fontSize: 13, color: "var(--white2)", marginBottom: 20, lineHeight: 1.5 }}>
              Abra seu autenticador (Google Authenticator, Authy) e insira o código de 6 dígitos.
            </p>
            <label style={S.label}>Código do autenticador</label>
            <input
              type="text"
              value={totpCode}
              onChange={e => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              autoComplete="one-time-code"
              autoFocus
              style={{ ...S.input, fontSize: 24, letterSpacing: "0.3em", textAlign: "center" }}
            />
            <button
              type="submit"
              disabled={loginLoading || totpCode.length < 6}
              style={S.btnPrimary(loginLoading || totpCode.length < 6)}
            >
              {loginLoading ? "Verificando..." : "Verificar código"}
            </button>
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <button type="button" style={S.btnGhost} onClick={() => { setStep("credentials"); setTotpCode(""); }}>
                ← Voltar
              </button>
            </div>
          </form>
        )}

        {/* ─── Step 3: 3FA e-mail OTP ──────────────────────────────────── */}
        {step === "3fa" && (
          <form onSubmit={handleThreeFa}>
            <p style={{ fontSize: 13, color: "var(--white2)", marginBottom: 20, lineHeight: 1.5 }}>
              Um código de 6 dígitos foi enviado para o seu e-mail. Insira abaixo para concluir o acesso.
            </p>
            <label style={S.label}>Código de verificação (e-mail)</label>
            <input
              type="text"
              value={threeFaCode}
              onChange={e => setThreeFaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              autoComplete="one-time-code"
              autoFocus
              style={{ ...S.input, fontSize: 24, letterSpacing: "0.3em", textAlign: "center" }}
            />
            <button
              type="submit"
              disabled={loginLoading || threeFaCode.length < 6}
              style={S.btnPrimary(loginLoading || threeFaCode.length < 6)}
            >
              {loginLoading ? "Verificando..." : "Confirmar acesso"}
            </button>
            <div style={{ textAlign: "center", marginTop: 14, display: "flex", justifyContent: "center", gap: 20 }}>
              <button
                type="button"
                style={{ ...S.btnGhost, opacity: resendCooldown > 0 ? 0.5 : 1 }}
                onClick={handleResend}
                disabled={resendCooldown > 0}
              >
                {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : "Reenviar código"}
              </button>
              <button type="button" style={S.btnGhost} onClick={() => { setStep("credentials"); setThreeFaCode(""); }}>
                ← Voltar
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}

export default LoginPage;
