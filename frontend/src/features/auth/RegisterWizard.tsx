import { useState, type FormEvent } from "react";
import { ArrowRight, ArrowLeft, Check, User, Building2, Lock, Upload } from "lucide-react";
import { BR_STATES, isValidCNPJ, formatCNPJ, formatPhone } from "../../utils/industry-constants";

interface FormData {
  // Step 1
  role: "demandante" | "fornecedor";
  // Step 2
  name: string;
  email: string;
  phone: string;
  // Step 3
  companyName: string;
  cnpj: string;
  city: string;
  uf: string;
  // Step 4
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export type RegisterWizardSubmitData = Omit<FormData, "confirmPassword" | "acceptTerms" | "uf">;

interface RegisterWizardProps {
  onSubmit: (data: RegisterWizardSubmitData) => Promise<{ ok: boolean; error?: string }>;
  onLogin: () => void;
  initialRole?: "demandante" | "fornecedor";
}

const STEPS = [
  { num: 1, label: "Perfil",   icon: User       },
  { num: 2, label: "Você",     icon: User       },
  { num: 3, label: "Empresa",  icon: Building2  },
  { num: 4, label: "Acesso",   icon: Lock       },
] as const;

/**
 * RegisterWizard — cadastro em 4 etapas com validação progressiva.
 * Reduz fricção de cadastro vs formulário gigante.
 */
export function RegisterWizard({ onSubmit, onLogin, initialRole = "demandante" }: RegisterWizardProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<FormData>({
    role: initialRole,
    name: "", email: "", phone: "",
    companyName: "", cnpj: "", city: "", uf: "",
    password: "", confirmPassword: "", acceptTerms: false,
  });

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setData((d) => ({ ...d, [key]: value }));
    setError("");
  };

  const validateStep = (s: number): string | null => {
    if (s === 1 && !data.role) return "Escolha um perfil.";
    if (s === 2) {
      if (!data.name.trim() || data.name.length < 3) return "Informe seu nome completo.";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) return "E-mail inválido.";
      if (data.phone && data.phone.replace(/\D/g, "").length < 10) return "Telefone inválido.";
    }
    if (s === 3) {
      if (!data.companyName.trim() || data.companyName.length < 3) return "Informe a razão social.";
      if (!isValidCNPJ(data.cnpj)) return "CNPJ inválido. Verifique os dígitos.";
      if (!data.city.trim()) return "Informe a cidade.";
      if (!data.uf) return "Selecione o estado.";
    }
    if (s === 4) {
      if (data.password.length < 8) return "Senha deve ter ao menos 8 caracteres.";
      if (!/[A-Z]/.test(data.password) || !/[0-9]/.test(data.password)) return "Senha deve ter letra maiúscula e número.";
      if (data.password !== data.confirmPassword) return "Senhas não coincidem.";
      if (!data.acceptTerms) return "Você precisa aceitar os Termos e a Política.";
    }
    return null;
  };

  const next = () => {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setStep((s) => Math.min(s + 1, 4));
  };

  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validateStep(4);
    if (err) { setError(err); return; }

    setSubmitting(true);
    const result = await onSubmit({
      role: data.role,
      name: data.name,
      email: data.email.toLowerCase().trim(),
      phone: data.phone,
      companyName: data.companyName,
      cnpj: data.cnpj.replace(/\D/g, ""),
      city: `${data.city.trim()}/${data.uf}`,
      password: data.password,
    });
    setSubmitting(false);

    if (!result.ok) setError(result.error || "Erro ao cadastrar.");
  };

  return (
    <main
      id="main-content"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: "100%",
          maxWidth: 520,
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          padding: 32,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: "var(--cond)",
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: ".06em",
              color: "var(--white)",
            }}
          >
            CAP<span style={{ color: "var(--amber)" }}>A</span>CITY
          </div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: "var(--white3)",
              letterSpacing: ".15em",
              textTransform: "uppercase",
              marginTop: 4,
            }}
          >
            Criar conta
          </div>
        </div>

        {/* Stepper */}
        <ol
          aria-label={`Passo ${step} de 4`}
          style={{
            display: "flex",
            justifyContent: "space-between",
            listStyle: "none",
            padding: 0,
            margin: 0,
            position: "relative",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 18,
              left: "12.5%",
              right: "12.5%",
              height: 1,
              background: "var(--border)",
              zIndex: 0,
            }}
          />
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isActive = s.num === step;
            const isDone = s.num < step;
            return (
              <li
                key={s.num}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  position: "relative",
                  zIndex: 1,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: isDone ? "var(--amber)" : isActive ? "var(--bg3)" : "var(--bg3)",
                    border: isActive ? "2px solid var(--amber)" : "1px solid var(--border2)",
                    color: isDone ? "var(--bg)" : isActive ? "var(--amber)" : "var(--white3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all .2s",
                  }}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isDone ? <Check size={16} /> : <Icon size={16} />}
                </div>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 9,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    color: isActive ? "var(--white)" : "var(--white3)",
                  }}
                >
                  {s.label}
                </div>
              </li>
            );
          })}
        </ol>

        {/* Step content */}
        <div style={{ minHeight: 240 }}>
          {step === 1 && (
            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <legend
                style={{
                  fontFamily: "var(--cond)",
                  fontSize: 18,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                  marginBottom: 12,
                }}
              >
                Como você quer usar a CapaCity?
              </legend>
              <div style={{ display: "grid", gap: 12 }}>
                {[
                  { value: "demandante", label: "Demandante", desc: "Quero terceirizar produção", icon: "🏭" },
                  { value: "fornecedor", label: "Fornecedor", desc: "Quero receber pedidos", icon: "⚙️" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    style={{
                      display: "flex",
                      gap: 14,
                      padding: 16,
                      background: data.role === opt.value ? "var(--amber-dim)" : "var(--bg3)",
                      border: data.role === opt.value ? "2px solid var(--amber)" : "1px solid var(--border)",
                      cursor: "pointer",
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={opt.value}
                      checked={data.role === opt.value}
                      onChange={() => update("role", opt.value as any)}
                      style={{ accentColor: "var(--amber)" }}
                    />
                    <div style={{ fontSize: 28 }} aria-hidden="true">{opt.icon}</div>
                    <div>
                      <div style={{ fontFamily: "var(--cond)", fontWeight: 700, fontSize: 16, color: "var(--white)" }}>{opt.label}</div>
                      <div style={{ fontFamily: "var(--body)", fontSize: 12, color: "var(--white2)" }}>{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Nome completo" htmlFor="name">
                <input id="name" autoFocus value={data.name} onChange={(e) => update("name", e.target.value)} autoComplete="name" />
              </Field>
              <Field label="E-mail profissional" htmlFor="email">
                <input id="email" type="email" value={data.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" />
              </Field>
              <Field label="Telefone (com DDD)" htmlFor="phone" hint="Opcional, mas ajuda a acelerar o KYC.">
                <input id="phone" type="tel" value={formatPhone(data.phone)} onChange={(e) => update("phone", e.target.value)} autoComplete="tel" placeholder="(11) 99999-9999" />
              </Field>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Razão social" htmlFor="companyName">
                <input id="companyName" autoFocus value={data.companyName} onChange={(e) => update("companyName", e.target.value)} autoComplete="organization" />
              </Field>
              <Field label="CNPJ" htmlFor="cnpj" hint="Validamos automaticamente.">
                <input
                  id="cnpj"
                  value={formatCNPJ(data.cnpj)}
                  onChange={(e) => update("cnpj", e.target.value)}
                  placeholder="00.000.000/0000-00"
                  inputMode="numeric"
                  maxLength={18}
                />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                <Field label="Cidade" htmlFor="city">
                  <input id="city" value={data.city} onChange={(e) => update("city", e.target.value)} autoComplete="address-level2" />
                </Field>
                <Field label="UF" htmlFor="uf">
                  <select id="uf" value={data.uf} onChange={(e) => update("uf", e.target.value)} autoComplete="address-level1">
                    <option value="">—</option>
                    {BR_STATES.map((s) => <option key={s.uf} value={s.uf}>{s.uf}</option>)}
                  </select>
                </Field>
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Senha" htmlFor="password" hint="Mínimo 8 caracteres, 1 maiúscula, 1 número.">
                <input id="password" type="password" autoFocus value={data.password} onChange={(e) => update("password", e.target.value)} autoComplete="new-password" />
              </Field>
              <Field label="Confirmar senha" htmlFor="confirmPassword">
                <input id="confirmPassword" type="password" value={data.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} autoComplete="new-password" />
              </Field>
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", fontFamily: "var(--body)", fontSize: 13, color: "var(--white2)", marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={data.acceptTerms}
                  onChange={(e) => update("acceptTerms", e.target.checked)}
                  style={{ accentColor: "var(--amber)", marginTop: 3, width: "auto" }}
                />
                <span>
                  Li e aceito os <a href="/termos" target="_blank" style={{ color: "var(--amber)" }}>Termos de Uso</a> e a <a href="/privacidade" target="_blank" style={{ color: "var(--amber)" }}>Política de Privacidade</a>.
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "var(--red)",
              padding: "10px 14px",
              fontFamily: "var(--body)",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
          {step > 1 ? (
            <button type="button" onClick={prev} disabled={submitting} style={btnGhost}>
              <ArrowLeft size={14} /> Voltar
            </button>
          ) : (
            <button type="button" onClick={onLogin} disabled={submitting} style={btnGhost}>
              Já tenho conta
            </button>
          )}
          {step < 4 ? (
            <button type="button" onClick={next} style={btnPrimary}>
              Continuar <ArrowRight size={14} />
            </button>
          ) : (
            <button type="submit" disabled={submitting} style={btnPrimary}>
              {submitting ? "Criando…" : "Criar conta"}
              <Check size={14} />
            </button>
          )}
        </div>
      </form>
    </main>
  );
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} style={{ display: "block", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--white3)", marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {hint && <div style={{ fontFamily: "var(--body)", fontSize: 11, color: "var(--white3)", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

const btnGhost: React.CSSProperties = {
  padding: "10px 16px",
  background: "transparent",
  color: "var(--white)",
  border: "1px solid var(--border2)",
  fontFamily: "var(--cond)",
  fontWeight: 700,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: ".08em",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 18px",
  background: "var(--amber)",
  color: "var(--bg)",
  border: "none",
  fontFamily: "var(--cond)",
  fontWeight: 700,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: ".08em",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
};
