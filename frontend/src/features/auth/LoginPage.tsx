/**
 * LoginPage — fluxo completo: email/senha, Google OAuth, TOTP (2FA) e 3FA email OTP.
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { Eye, EyeOff, ShieldCheck, Mail } from "lucide-react";
import { useAuth } from "../../app/AuthContext";
import { Input } from "../../components/ui/Input";
import { UserRole } from "../../types";

type Step = "credentials" | "totp" | "3fa";

const ROLE_OPTIONS = [
  { role: "demandante" as UserRole, label: "Sou demandante" },
  { role: "fornecedor" as UserRole, label: "Sou fornecedor" },
];

export function LoginPage() {
  const navigate = useNavigate();
  const { login, loginGoogle, verify3fa, resend3fa, loginErr, loginLoading } = useAuth();

  const [step, setStep] = useState<Step>("credentials");
  const [role, setRole] = useState<UserRole>("demandante");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [threeFaCode, setThreeFaCode] = useState("");
  const [pendingUserId, setPendingUserId] = useState("");
  const [localError, setLocalError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const displayError = localError || loginErr;

  // Step 1: login normal
  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    if (!email.trim()) { setLocalError("Informe o e-mail."); return; }
    if (!password) { setLocalError("Informe a senha."); return; }

    const result = await login(email.trim(), password, role);
    if (result === true) {
      navigate("/dashboard");
    } else if (typeof result === "string" && result === "totp_required") {
      setStep("totp");
    } else if (typeof result === "string" && result.startsWith("3fa_required|")) {
      const uid = result.split("|")[1];
      setPendingUserId(uid);
      setStep("3fa");
    }
  };

  // Step 2: TOTP
  const handleTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    if (totpCode.length < 6) { setLocalError("Código deve ter 6 dígitos."); return; }
    const result = await login(email.trim(), password, role, totpCode);
    if (result === true) {
      navigate("/dashboard");
    } else if (typeof result === "string" && result.startsWith("3fa_required|")) {
      const uid = result.split("|")[1];
      setPendingUserId(uid);
      setStep("3fa");
    }
  };

  // Step 3: 3FA e-mail OTP
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
    const interval = setInterval(() => {
      setResendCooldown(prev => { if (prev <= 1) { clearInterval(interval); return 0; } return prev - 1; });
    }, 1000);
  };

  // Google OAuth
  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return;
    const result = await loginGoogle(credentialResponse.credential);
    if (result === true) {
      navigate("/dashboard");
    } else if (typeof result === "string" && result.startsWith("3fa_required|")) {
      const uid = result.split("|")[1];
      setPendingUserId(uid);
      setStep("3fa");
    }
  };

  // ─── Estilos base ─────────────────────────────────────────────────────────

  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg)",
    padding: "24px 16px",
    fontFamily: "var(--body)",
  };

  const cardStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 420,
    background: "var(--bg2)",
    border: "1px solid var(--border)",
    padding: "40px 36px",
  };

  const titleStyle: React.CSSProperties = {
    fontFamily: "var(--cond)",
    fontSize: 28,
    fontWeight: 700,
    color: "var(--white)",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    marginBottom: 4,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: 13,
    color: "var(--white3)",
    marginBottom: 28,
  };

  const btnPrimary: React.CSSProperties = {
    width: "100%",
    background: "var(--amber)",
    color: "#000",
    fontFamily: "var(--cond)",
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    border: "none",
    padding: "12px",
    cursor: "pointer",
    marginTop: 8,
  };

  const btnSecondary: React.CSSProperties = {
    background: "transparent",
    border: "none",
    color: "var(--amber)",
    fontSize: 13,
    cursor: "pointer",
    padding: "4px 0",
    fontFamily: "var(--body)",
  };

  const dividerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    margin: "20px 0",
    color: "var(--white3)",
    fontSize: 12,
  };

  const dividerLine: React.CSSProperties = { flex: 1, height: 1, background: "var(--border)" };

  // ─── Renderizar step ───────────────────────────────────────────────────────

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={titleStyle}>CAPA<span style={{ color: "var(--amber)" }}>CITY</span></div>
          {step === "credentials" && <p style={subtitleStyle}>Entre na sua conta</p>}
          {step === "totp" && (
            <p style={subtitleStyle}>
              <ShieldCheck size={14} style={{ display: "inline", marginRight: 4 }} />
              Verificação em 2 fatores
            </p>
          )}
          {step === "3fa" && (
            <p style={subtitleStyle}>
              <Mail size={14} style={{ display: "inline", marginRight: 4 }} />
              Verificação em 3 fatores
            </p>
          )}
        </div>

        {/* Erro */}
        {displayError && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
            {displayError}
          </div>
        )}

        {/* ─── Step 1: Credenciais ──────────────────────────────────────── */}
        {step === "credentials" && (
          <>
            {/* Seletor de role */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {ROLE_OPTIONS.map(opt => (
                <button
                  key={opt.role}
                  type="button"
                  onClick={() => setRole(opt.role)}
                  style={{
                    flex: 1,
                    padding: "8px 4px",
                    border: `1px solid ${role === opt.role ? "var(--amber)" : "var(--border)"}`,
                    background: role === opt.role ? "rgba(217,119,6,0.1)" : "transparent",
                    color: role === opt.role ? "var(--amber)" : "var(--white3)",
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Formulário */}
            <form onSubmit={handleCredentials}>
              <div style={{ marginBottom: 16 }}>
                <Input
                  label="E-mail"
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                />
              </div>
              <div style={{ marginBottom: 20, position: "relative" }}>
                <Input
                  label="Senha"
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  style={{ position: "absolute", right: 12, top: 30, background: "none", border: "none", color: "var(--white3)", cursor: "pointer" }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <button type="submit" disabled={loginLoading} style={btnPrimary}>
                {loginLoading ? "Entrando..." : "Entrar"}
              </button>
            </form>

            {/* Divisor */}
            <div style={dividerStyle}>
              <span style={dividerLine} /><span>ou</span><span style={dividerLine} />
            </div>

            {/* Google OAuth */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setLocalError("Falha ao autenticar com Google.")}
                text="signin_with"
                shape="rectangular"
                theme="filled_black"
                width="348"
              />
            </div>

            {/* Links */}
            <div style={{ marginTop: 20, textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
              <button type="button" style={btnSecondary} onClick={() => (window.location.href = "/forgot-password")}>
                Esqueci minha senha
              </button>
              <span style={{ fontSize: 13, color: "var(--white3)" }}>
                Não tem conta?{" "}
                <button type="button" style={{ ...btnSecondary, display: "inline" }} onClick={() => (window.location.href = "/cadastro")}>
                  Cadastre-se
                </button>
              </span>
            </div>
          </>
        )}

        {/* ─── Step 2: TOTP ─────────────────────────────────────────────── */}
        {step === "totp" && (
          <form onSubmit={handleTotp}>
            <p style={{ fontSize: 14, color: "var(--white2)", marginBottom: 20 }}>
              Abra seu aplicativo autenticador (Google Authenticator, Authy) e insira o código de 6 dígitos.
            </p>
            <div style={{ marginBottom: 20 }}>
              <Input
                label="Código do autenticador"
                id="totp-code"
                type="text"
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                autoComplete="one-time-code"
                autoFocus
              />
            </div>
            <button type="submit" disabled={loginLoading || totpCode.length < 6} style={btnPrimary}>
              {loginLoading ? "Verificando..." : "Verificar código"}
            </button>
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button type="button" style={btnSecondary} onClick={() => { setStep("credentials"); setTotpCode(""); }}>
                ← Voltar
              </button>
            </div>
          </form>
        )}

        {/* ─── Step 3: 3FA e-mail OTP ───────────────────────────────────── */}
        {step === "3fa" && (
          <form onSubmit={handleThreeFa}>
            <p style={{ fontSize: 14, color: "var(--white2)", marginBottom: 20 }}>
              Um código de 6 dígitos foi enviado para o seu e-mail. Insira abaixo para concluir o acesso.
            </p>
            <div style={{ marginBottom: 20 }}>
              <Input
                label="Código de verificação (e-mail)"
                id="3fa-code"
                type="text"
                value={threeFaCode}
                onChange={e => setThreeFaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                autoComplete="one-time-code"
                autoFocus
              />
            </div>
            <button type="submit" disabled={loginLoading || threeFaCode.length < 6} style={btnPrimary}>
              {loginLoading ? "Verificando..." : "Confirmar acesso"}
            </button>
            <div style={{ textAlign: "center", marginTop: 12, display: "flex", justifyContent: "center", gap: 16 }}>
              <button
                type="button"
                style={{ ...btnSecondary, opacity: resendCooldown > 0 ? 0.5 : 1 }}
                onClick={handleResend}
                disabled={resendCooldown > 0}
              >
                {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : "Reenviar código"}
              </button>
              <button type="button" style={btnSecondary} onClick={() => { setStep("credentials"); setThreeFaCode(""); }}>
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
