/**
 * OnboardingWizard — 4-step guided onboarding for new users.
 *
 * Step 1: Welcome (role-aware)
 * Step 2: Complete company profile
 * Step 3: Role-specific action (publish demand / upload KYC docs)
 * Step 4: Conclusion + mark onboarding complete
 *
 * Inline styles only. TypeScript strict.
 */

import React, { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../services/api";
import { useAuth } from "../../app/AuthContext";
import type { UserRole } from "../../types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompanyProfileForm {
  cnpj: string;
  phone: string;
  address: string;
  site: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "cap4_onboarding_step";
const TOTAL_STEPS = 4;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSavedStep(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= TOTAL_STEPS) {
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }
  return 1;
}

function saveStep(step: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(step));
  } catch {
    /* ignore */
  }
}

function clearStep(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 28,
      }}
    >
      {Array.from({ length: total }).map((_, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = step < current;
        return (
          <React.Fragment key={step}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--mono)",
                fontSize: 10,
                fontWeight: 700,
                background: isActive
                  ? "var(--amber)"
                  : isDone
                  ? "var(--amber)44"
                  : "var(--bg3)",
                color: isActive
                  ? "var(--bg)"
                  : isDone
                  ? "var(--amber)"
                  : "var(--white3)",
                border: `1px solid ${isActive ? "var(--amber)" : isDone ? "var(--amber)44" : "var(--border)"}`,
                flexShrink: 0,
              }}
            >
              {isDone ? "✓" : step}
            </div>
            {step < total && (
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: isDone ? "var(--amber)44" : "var(--border)",
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Step 1 — Welcome ─────────────────────────────────────────────────────────

function Step1Welcome({
  role,
  onNext,
  onSkip,
}: {
  role: UserRole;
  onNext: () => void;
  onSkip: () => void;
}) {
  const isDemandante = role === "demandante";
  return (
    <div>
      <h2
        style={{
          fontFamily: "var(--cond)",
          fontSize: 26,
          fontWeight: 800,
          textTransform: "uppercase",
          color: "var(--white)",
          marginBottom: 12,
          letterSpacing: ".04em",
        }}
      >
        {isDemandante ? "Publique sua primeira demanda em 3 passos" : "Complete seu perfil para receber propostas"}
      </h2>
      <p
        style={{
          fontFamily: "var(--body)",
          fontSize: 14,
          color: "var(--white3)",
          lineHeight: 1.6,
          marginBottom: 28,
        }}
      >
        {isDemandante
          ? "Bem-vindo ao CapaCity! Como demandante, você pode publicar demandas industriais e receber propostas de fornecedores qualificados."
          : "Bem-vindo ao CapaCity! Como fornecedor, complete seu perfil e envie a documentação para começar a receber oportunidades."}
      </p>

      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={onNext}
          style={{
            padding: "12px 24px",
            background: "var(--amber)",
            border: "none",
            color: "var(--bg)",
            fontFamily: "var(--cond)",
            fontWeight: 700,
            fontSize: 14,
            textTransform: "uppercase",
            letterSpacing: ".06em",
            cursor: "pointer",
          }}
        >
          Começar
        </button>
        <button
          onClick={onSkip}
          style={{
            padding: "12px 24px",
            background: "transparent",
            border: "1px solid var(--border2)",
            color: "var(--white3)",
            fontFamily: "var(--mono)",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: ".06em",
            cursor: "pointer",
          }}
        >
          Fazer depois
        </button>
      </div>
    </div>
  );
}

// ─── Step 2 — Company profile ─────────────────────────────────────────────────

function Step2Profile({
  companyId,
  onNext,
  onBack,
}: {
  companyId: string | null | undefined;
  onNext: () => void;
  onBack: () => void;
}) {
  const [form, setForm] = useState<CompanyProfileForm>({
    cnpj: "",
    phone: "",
    address: "",
    site: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!companyId) {
        onNext();
        return;
      }
      setSaving(true);
      setError("");
      try {
        const res = await apiFetch(`/v1/companies/${companyId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(form.cnpj ? { cnpj: form.cnpj } : {}),
            ...(form.phone ? { phone: form.phone } : {}),
            ...(form.address ? { address: form.address } : {}),
            ...(form.site ? { site: form.site } : {}),
          }),
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          setError(data.error || "Erro ao salvar dados.");
          return;
        }
        onNext();
      } catch {
        setError("Erro de conexão ao salvar dados.");
      } finally {
        setSaving(false);
      }
    },
    [companyId, form, onNext]
  );

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    background: "var(--bg3)",
    border: "1px solid var(--border)",
    color: "var(--white)",
    fontFamily: "var(--body)",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontFamily: "var(--mono)",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: ".1em",
    color: "var(--white3)",
    marginBottom: 6,
  };

  return (
    <div>
      <h2
        style={{
          fontFamily: "var(--cond)",
          fontSize: 22,
          fontWeight: 800,
          textTransform: "uppercase",
          color: "var(--white)",
          marginBottom: 8,
          letterSpacing: ".04em",
        }}
      >
        Completar perfil da empresa
      </h2>
      <p
        style={{
          fontFamily: "var(--body)",
          fontSize: 13,
          color: "var(--white3)",
          marginBottom: 24,
        }}
      >
        Adicione informações extras para que parceiros possam encontrar você facilmente.
      </p>

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div>
            <label style={labelStyle}>CNPJ</label>
            <input
              style={fieldStyle}
              name="cnpj"
              value={form.cnpj}
              onChange={handleChange}
              placeholder="00.000.000/0001-00"
            />
          </div>
          <div>
            <label style={labelStyle}>Telefone</label>
            <input
              style={fieldStyle}
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="(11) 99999-9999"
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Endereço</label>
          <input
            style={fieldStyle}
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="Rua, número, cidade, estado"
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Site</label>
          <input
            style={fieldStyle}
            name="site"
            value={form.site}
            onChange={handleChange}
            placeholder="https://www.suaempresa.com.br"
          />
        </div>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              background: "var(--red)18",
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

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "12px 24px",
              background: saving ? "var(--amber)88" : "var(--amber)",
              border: "none",
              color: "var(--bg)",
              fontFamily: "var(--cond)",
              fontWeight: 700,
              fontSize: 14,
              textTransform: "uppercase",
              letterSpacing: ".06em",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Salvando…" : "Continuar"}
          </button>
          <button
            type="button"
            onClick={onNext}
            style={{
              padding: "12px 24px",
              background: "transparent",
              border: "1px solid var(--border2)",
              color: "var(--white3)",
              fontFamily: "var(--mono)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: ".06em",
              cursor: "pointer",
            }}
          >
            Pular
          </button>
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: "12px 24px",
              background: "transparent",
              border: "none",
              color: "var(--white3)",
              fontFamily: "var(--mono)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: ".06em",
              cursor: "pointer",
            }}
          >
            Voltar
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Step 3 — Role-specific action ───────────────────────────────────────────

function Step3Action({
  role,
  onNext,
  onBack,
}: {
  role: UserRole;
  onNext: () => void;
  onBack: () => void;
}) {
  const isDemandante = role === "demandante";

  return (
    <div>
      <h2
        style={{
          fontFamily: "var(--cond)",
          fontSize: 22,
          fontWeight: 800,
          textTransform: "uppercase",
          color: "var(--white)",
          marginBottom: 8,
          letterSpacing: ".04em",
        }}
      >
        {isDemandante ? "Publique sua primeira demanda" : "Envie os documentos de verificação"}
      </h2>
      <p
        style={{
          fontFamily: "var(--body)",
          fontSize: 13,
          color: "var(--white3)",
          lineHeight: 1.6,
          marginBottom: 24,
        }}
      >
        {isDemandante
          ? "Descreva o que sua empresa precisa — processo, material, quantidade, prazo — e receba propostas de fornecedores qualificados em poucos dias."
          : "Envie os documentos obrigatórios (Cartão CNPJ, Contrato Social e RG/CNH) para que nossa equipe possa verificar sua empresa e liberar acesso completo."}
      </p>

      <div
        style={{
          padding: "20px 24px",
          background: "var(--bg3)",
          border: "1px solid var(--border)",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: ".08em",
            color: "var(--amber)",
            marginBottom: 8,
          }}
        >
          {isDemandante ? "Próximo passo" : "Documentos necessários"}
        </div>
        {isDemandante ? (
          <div
            style={{
              fontFamily: "var(--body)",
              fontSize: 13,
              color: "var(--white2)",
              lineHeight: 1.7,
            }}
          >
            • Descreva o processo e o material necessário<br />
            • Informe a quantidade e o prazo de entrega<br />
            • Defina o nível de urgência e orçamento máximo
          </div>
        ) : (
          <div
            style={{
              fontFamily: "var(--body)",
              fontSize: 13,
              color: "var(--white2)",
              lineHeight: 1.7,
            }}
          >
            • Cartão CNPJ (Receita Federal)<br />
            • Contrato Social ou Estatuto<br />
            • RG / CNH do responsável legal
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <a
          href={isDemandante ? "/nova-demanda" : "/verificacao"}
          style={{
            display: "inline-block",
            padding: "12px 24px",
            background: "var(--amber)",
            border: "none",
            color: "var(--bg)",
            fontFamily: "var(--cond)",
            fontWeight: 700,
            fontSize: 14,
            textTransform: "uppercase",
            letterSpacing: ".06em",
            textDecoration: "none",
          }}
        >
          {isDemandante ? "Publicar demanda" : "Verificar agora"}
        </a>
        <button
          onClick={onNext}
          style={{
            padding: "12px 24px",
            background: "transparent",
            border: "1px solid var(--border2)",
            color: "var(--white3)",
            fontFamily: "var(--mono)",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: ".06em",
            cursor: "pointer",
          }}
        >
          Pular
        </button>
        <button
          onClick={onBack}
          style={{
            padding: "12px 24px",
            background: "transparent",
            border: "none",
            color: "var(--white3)",
            fontFamily: "var(--mono)",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: ".06em",
            cursor: "pointer",
          }}
        >
          Voltar
        </button>
      </div>
    </div>
  );
}

// ─── Step 4 — Done ───────────────────────────────────────────────────────────

function Step4Done({
  role,
  onFinish,
  onBack,
  finishing,
}: {
  role: UserRole;
  onFinish: () => void;
  onBack: () => void;
  finishing: boolean;
}) {
  const isDemandante = role === "demandante";

  const checklistItems = isDemandante
    ? [
        { done: false, text: "Publicar primeira demanda em /nova-demanda" },
        { done: false, text: "Acompanhar propostas recebidas em /propostas" },
        { done: false, text: "Aceitar uma proposta e gerar contrato" },
      ]
    : [
        { done: false, text: "Enviar documentos de verificação em /verificacao" },
        { done: false, text: "Aguardar aprovação (até 2 dias úteis)" },
        { done: false, text: "Responder demandas e enviar propostas" },
      ];

  return (
    <div>
      <h2
        style={{
          fontFamily: "var(--cond)",
          fontSize: 26,
          fontWeight: 800,
          textTransform: "uppercase",
          color: "var(--amber)",
          marginBottom: 8,
          letterSpacing: ".04em",
        }}
      >
        Conta configurada!
      </h2>
      <p
        style={{
          fontFamily: "var(--body)",
          fontSize: 14,
          color: "var(--white3)",
          lineHeight: 1.6,
          marginBottom: 24,
        }}
      >
        Você está pronto para usar o CapaCity. Veja os próximos passos para aproveitar ao máximo a plataforma.
      </p>

      <div
        style={{
          background: "var(--bg3)",
          border: "1px solid var(--border)",
          padding: "20px 24px",
          marginBottom: 28,
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: ".08em",
            color: "var(--white3)",
            marginBottom: 14,
          }}
        >
          Próximos passos
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {checklistItems.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  border: "1px solid var(--border2)",
                  background: "var(--bg2)",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              />
              <span
                style={{
                  fontFamily: "var(--body)",
                  fontSize: 13,
                  color: "var(--white2)",
                  lineHeight: 1.5,
                }}
              >
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={onFinish}
          disabled={finishing}
          style={{
            padding: "12px 24px",
            background: finishing ? "var(--amber)88" : "var(--amber)",
            border: "none",
            color: "var(--bg)",
            fontFamily: "var(--cond)",
            fontWeight: 700,
            fontSize: 14,
            textTransform: "uppercase",
            letterSpacing: ".06em",
            cursor: finishing ? "not-allowed" : "pointer",
          }}
        >
          {finishing ? "Salvando…" : "Ir para o dashboard"}
        </button>
        <button
          onClick={onBack}
          style={{
            padding: "12px 24px",
            background: "transparent",
            border: "none",
            color: "var(--white3)",
            fontFamily: "var(--mono)",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: ".06em",
            cursor: "pointer",
          }}
        >
          Voltar
        </button>
      </div>
    </div>
  );
}

// ─── OnboardingWizard ─────────────────────────────────────────────────────────

interface OnboardingWizardProps {
  /** Called when onboarding is dismissed (skipped or completed). */
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState<number>(() => getSavedStep());
  const [finishing, setFinishing] = useState(false);

  // Sync step to localStorage
  useEffect(() => {
    saveStep(step);
  }, [step]);

  const goNext = useCallback(() => {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, []);

  const goBack = useCallback(() => {
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const handleSkip = useCallback(() => {
    clearStep();
    onComplete();
  }, [onComplete]);

  const handleFinish = useCallback(async () => {
    setFinishing(true);
    try {
      const res = await apiFetch("/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboarding_completed: true }),
      });
      if (res.ok) {
        updateUser({ onboarding_completed: true });
      }
    } catch {
      /* silent — still complete wizard locally */
    } finally {
      setFinishing(false);
      clearStep();
      onComplete();
    }
  }, [onComplete, updateUser]);

  const role = user?.role ?? "demandante";
  const companyId = user?.company_id ?? user?.companyId ?? null;

  return (
    /* Overlay backdrop */
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(7,7,8,0.85)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      {/* Modal card */}
      <div
        style={{
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          padding: "32px 36px",
          maxWidth: 560,
          width: "100%",
          position: "relative",
        }}
      >
        {/* Close / skip button */}
        <button
          onClick={handleSkip}
          aria-label="Fechar"
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            background: "transparent",
            border: "none",
            color: "var(--white3)",
            fontFamily: "var(--mono)",
            fontSize: 16,
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ×
        </button>

        {/* Step indicator */}
        <StepIndicator current={step} total={TOTAL_STEPS} />

        {/* Step content */}
        {step === 1 && (
          <Step1Welcome role={role as UserRole} onNext={goNext} onSkip={handleSkip} />
        )}
        {step === 2 && (
          <Step2Profile companyId={companyId} onNext={goNext} onBack={goBack} />
        )}
        {step === 3 && (
          <Step3Action role={role as UserRole} onNext={goNext} onBack={goBack} />
        )}
        {step === 4 && (
          <Step4Done
            role={role as UserRole}
            onFinish={handleFinish}
            onBack={goBack}
            finishing={finishing}
          />
        )}
      </div>
    </div>
  );
}

export default OnboardingWizard;
