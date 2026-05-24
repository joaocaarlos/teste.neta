/**
 * #24 — Guided demand creation wizard (8 steps)
 */
import React, { useState, useCallback } from "react";
import { color, font, fontSize, space } from "../../styles/tokens";
import { Input } from "../../components/ui/Input";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DemandDraft {
  // Step 1
  title: string;
  category: string;
  description: string;
  // Step 2
  process: string;
  materials: string[];
  // Step 3
  dimensions: string;
  tolerances: string;
  finish: string;
  // Step 4
  technicalFiles: File[];
  // Step 5
  quantity: number | "";
  deadline: string;
  frequency: "once" | "recurring" | "";
  // Step 6
  certifications: string[];
  requiresInspection: boolean;
  requiresReport: boolean;
  // Step 7
  ndaMode: "automatic" | "custom" | "none";
  // Step 8 — review only
}

const INITIAL: DemandDraft = {
  title: "", category: "", description: "",
  process: "", materials: [],
  dimensions: "", tolerances: "", finish: "",
  technicalFiles: [],
  quantity: "", deadline: "", frequency: "",
  certifications: [], requiresInspection: false, requiresReport: false,
  ndaMode: "automatic",
};

const STEPS = [
  "Dados Gerais",
  "Processo Necessário",
  "Especificações",
  "Arquivos Técnicos",
  "Quantidade & Prazo",
  "Requisitos de Qualidade",
  "Confidencialidade",
  "Revisão & Publicação",
];

const PROCESSES = ["Usinagem CNC", "Injeção Plástica", "Caldeiraria", "Metalurgia", "Estampagem", "Fundição", "Soldagem", "Corte a Laser", "Fresamento", "Torneamento"];
const MATERIALS = ["Aço", "Alumínio", "Inox", "Plástico", "Cobre", "Titânio", "Fibra de Carbono"];
const CERTS     = ["ISO 9001", "ISO 14001", "IATF 16949", "AS9100", "ABNT NBR"];

// ─── Step components ─────────────────────────────────────────────────────────

function CheckGroup({ label, options, selected, onChange }: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) =>
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  return (
    <div style={{ marginBottom: space.md }}>
      <div style={{ fontFamily: font.mono, fontSize: fontSize.label, letterSpacing: "0.12em", textTransform: "uppercase", color: color.white2, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            style={{
              padding: "6px 14px",
              border: `1px solid ${selected.includes(opt) ? color.amber : color.border}`,
              background: selected.includes(opt) ? color.amberDim : "transparent",
              color: selected.includes(opt) ? color.amber : color.white2,
              fontFamily: font.mono,
              fontSize: fontSize.label,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function Select({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ marginBottom: space.md }}>
      <div style={{ fontFamily: font.mono, fontSize: fontSize.label, letterSpacing: "0.12em", textTransform: "uppercase", color: color.white2, marginBottom: 6 }}>
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ background: color.bg3, border: `1px solid ${color.border}`, color: color.white, fontFamily: font.body, fontSize: fontSize.body, padding: "10px 14px", width: "100%" }}
      >
        <option value="">Selecione…</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ─── Step renderers ───────────────────────────────────────────────────────────

function StepContent({ step, draft, update }: {
  step: number;
  draft: DemandDraft;
  update: (patch: Partial<DemandDraft>) => void;
}) {
  switch (step) {
    case 0:
      return (
        <>
          <Input label="Título da demanda *" value={draft.title} onChange={(e) => update({ title: e.target.value })} placeholder="Ex: Usinagem de flange de aço inox 316L" />
          <Select label="Categoria" value={draft.category} options={["Metalmecânica", "Plásticos", "Eletrônica", "Têxtil", "Alimentos"]} onChange={(v) => update({ category: v })} />
          <div style={{ marginBottom: space.md }}>
            <div style={{ fontFamily: font.mono, fontSize: fontSize.label, letterSpacing: "0.12em", textTransform: "uppercase", color: color.white2, marginBottom: 6 }}>Descrição</div>
            <textarea
              value={draft.description}
              onChange={(e) => update({ description: e.target.value })}
              rows={4}
              style={{ background: color.bg3, border: `1px solid ${color.border}`, color: color.white, fontFamily: font.body, fontSize: fontSize.body, padding: "10px 14px", width: "100%", resize: "vertical" }}
            />
          </div>
        </>
      );

    case 1:
      return (
        <>
          <Select label="Processo produtivo *" value={draft.process} options={PROCESSES} onChange={(v) => update({ process: v })} />
          <CheckGroup label="Materiais aceitos" options={MATERIALS} selected={draft.materials} onChange={(v) => update({ materials: v })} />
        </>
      );

    case 2:
      return (
        <>
          <Input label="Dimensões" value={draft.dimensions} onChange={(e) => update({ dimensions: e.target.value })} placeholder="Ex: Ø50mm × 120mm" />
          <Input label="Tolerâncias" value={draft.tolerances} onChange={(e) => update({ tolerances: e.target.value })} placeholder="Ex: ±0.05mm" />
          <Input label="Acabamento superficial" value={draft.finish} onChange={(e) => update({ finish: e.target.value })} placeholder="Ex: Ra 1.6μm" />
        </>
      );

    case 3:
      return (
        <div>
          <div style={{ fontFamily: font.mono, fontSize: fontSize.label, letterSpacing: "0.12em", textTransform: "uppercase", color: color.white2, marginBottom: 8 }}>
            Arquivos técnicos (desenhos, modelos 3D, normas)
          </div>
          <div
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files);
              update({ technicalFiles: [...draft.technicalFiles, ...files] });
            }}
            onDragOver={(e) => e.preventDefault()}
            style={{ border: `2px dashed ${color.border2}`, padding: "32px 24px", textAlign: "center", marginBottom: 16, color: color.white3, fontFamily: font.mono, fontSize: fontSize.caption }}
          >
            Arraste arquivos aqui ou
            <label style={{ color: color.amber, cursor: "pointer", marginLeft: 6 }}>
              clique para selecionar
              <input type="file" multiple style={{ display: "none" }} onChange={(e) => {
                const files = Array.from(e.target.files || []);
                update({ technicalFiles: [...draft.technicalFiles, ...files] });
              }} />
            </label>
          </div>
          {draft.technicalFiles.length > 0 && (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {draft.technicalFiles.map((f, i) => (
                <li key={i} style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: color.white2, padding: "6px 0", borderBottom: `1px solid ${color.border}`, display: "flex", justifyContent: "space-between" }}>
                  <span>{f.name}</span>
                  <button onClick={() => update({ technicalFiles: draft.technicalFiles.filter((_, j) => j !== i) })} style={{ background: "none", border: "none", color: color.red, cursor: "pointer", fontFamily: font.mono, fontSize: fontSize.label }}>✕</button>
                </li>
              ))}
            </ul>
          )}
          <p style={{ fontFamily: font.mono, fontSize: "9px", color: color.white3, marginTop: 8 }}>
            ⚠ Arquivos só serão visíveis para fornecedores com NDA assinado (configurado no passo 7).
          </p>
        </div>
      );

    case 4:
      return (
        <>
          <Input label="Quantidade necessária *" type="number" min={1} value={draft.quantity === "" ? "" : String(draft.quantity)} onChange={(e) => update({ quantity: e.target.value ? Number(e.target.value) : "" })} placeholder="Ex: 500" />
          <Input label="Data de entrega desejada" type="date" value={draft.deadline} onChange={(e) => update({ deadline: e.target.value })} />
          <Select label="Frequência" value={draft.frequency} options={["Compra única", "Recorrente mensal", "Recorrente trimestral"]} onChange={(v) => update({ frequency: v as DemandDraft["frequency"] })} />
        </>
      );

    case 5:
      return (
        <>
          <CheckGroup label="Certificações exigidas" options={CERTS} selected={draft.certifications} onChange={(v) => update({ certifications: v })} />
          <div style={{ display: "flex", gap: 24, marginTop: 8 }}>
            {[
              { key: "requiresInspection" as const, label: "Inspeção obrigatória" },
              { key: "requiresReport" as const, label: "Relatório de conformidade" },
            ].map(({ key, label }) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: font.mono, fontSize: fontSize.caption, color: color.white2, cursor: "pointer" }}>
                <input type="checkbox" checked={draft[key]} onChange={(e) => update({ [key]: e.target.checked })} />
                {label}
              </label>
            ))}
          </div>
        </>
      );

    case 6:
      return (
        <>
          <div style={{ fontFamily: font.mono, fontSize: fontSize.label, letterSpacing: "0.12em", textTransform: "uppercase", color: color.white2, marginBottom: 12 }}>
            Configuração de NDA
          </div>
          {(["automatic", "custom", "none"] as const).map((mode) => (
            <label key={mode} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16, cursor: "pointer" }}>
              <input type="radio" name="ndaMode" value={mode} checked={draft.ndaMode === mode} onChange={() => update({ ndaMode: mode })} style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: color.white }}>{
                  mode === "automatic" ? "NDA automático (recomendado)" :
                  mode === "custom"    ? "NDA personalizado" :
                                        "Sem NDA (arquivos públicos)"
                }</div>
                <div style={{ fontFamily: font.mono, fontSize: "9px", color: color.white3, marginTop: 2 }}>{
                  mode === "automatic" ? "Sistema gera NDA padrão. Fornecedor assina antes de acessar os arquivos técnicos." :
                  mode === "custom"    ? "Você fornece o texto do NDA. Contato legal recomendado." :
                                        "Arquivos técnicos acessíveis sem assinatura de NDA."
                }</div>
              </div>
            </label>
          ))}
        </>
      );

    case 7:
      return (
        <div>
          <div style={{ fontFamily: font.mono, fontSize: fontSize.label, letterSpacing: "0.12em", textTransform: "uppercase", color: color.white2, marginBottom: 16 }}>
            Resumo da demanda
          </div>
          {[
            ["Título", draft.title || "—"],
            ["Categoria", draft.category || "—"],
            ["Processo", draft.process || "—"],
            ["Materiais", draft.materials.join(", ") || "—"],
            ["Dimensões", draft.dimensions || "—"],
            ["Quantidade", draft.quantity ? String(draft.quantity) : "—"],
            ["Prazo", draft.deadline || "—"],
            ["Frequência", draft.frequency || "—"],
            ["Certificações", draft.certifications.join(", ") || "Nenhuma"],
            ["NDA", draft.ndaMode === "automatic" ? "Automático" : draft.ndaMode === "custom" ? "Personalizado" : "Sem NDA"],
            ["Arquivos", `${draft.technicalFiles.length} arquivo(s)`],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", borderBottom: `1px solid ${color.border}`, padding: "10px 0", gap: 16 }}>
              <span style={{ fontFamily: font.mono, fontSize: fontSize.label, color: color.white3, minWidth: 140, textTransform: "uppercase", letterSpacing: "0.08em" }}>{k}</span>
              <span style={{ fontFamily: font.body, fontSize: fontSize.body, color: color.white }}>{v}</span>
            </div>
          ))}
        </div>
      );
  }
  return null;
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export interface DemandWizardProps {
  onPublish: (draft: DemandDraft) => Promise<void>;
  onCancel?: () => void;
}

export function DemandWizard({ onPublish, onCancel }: DemandWizardProps) {
  const [step, setStep]       = useState(0);
  const [draft, setDraft]     = useState<DemandDraft>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const update = useCallback((patch: Partial<DemandDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError(null);
  }, []);

  const validate = (): string | null => {
    if (step === 0 && !draft.title.trim()) return "Título é obrigatório.";
    if (step === 1 && !draft.process) return "Selecione o processo produtivo.";
    if (step === 4 && !draft.quantity) return "Informe a quantidade necessária.";
    return null;
  };

  const next = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const publish = async () => {
    setLoading(true);
    setError(null);
    try {
      await onPublish(draft);
    } catch (e) {
      setError((e as Error).message || "Erro ao publicar demanda.");
    } finally {
      setLoading(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: `${space.xl}px ${space.md}px` }}>
      {/* Header */}
      <div style={{ marginBottom: space.lg }}>
        <div style={{ fontFamily: font.mono, fontSize: fontSize.label, letterSpacing: "0.2em", textTransform: "uppercase", color: color.amber, marginBottom: 8 }}>
          Passo {step + 1} de {STEPS.length}
        </div>
        <h1 style={{ fontFamily: font.condensed, fontSize: fontSize.h2, fontWeight: 700, textTransform: "uppercase", color: color.white, margin: 0 }}>
          {STEPS[step]}
        </h1>
      </div>

      {/* Progress bar */}
      <div style={{ background: color.bg3, height: 3, marginBottom: space.xl, borderRadius: 2 }}>
        <div style={{ background: color.amber, height: "100%", width: `${progress}%`, transition: "width 0.3s ease", borderRadius: 2 }} />
      </div>

      {/* Step navigation pills */}
      <div style={{ display: "flex", gap: 6, marginBottom: space.lg, flexWrap: "wrap" }}>
        {STEPS.map((s, i) => (
          <div
            key={i}
            style={{
              fontFamily: font.mono,
              fontSize: "9px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "3px 10px",
              border: `1px solid ${i === step ? color.amber : i < step ? color.green : color.border}`,
              color: i === step ? color.amber : i < step ? color.green : color.white3,
              background: i === step ? color.amberDim : "transparent",
            }}
          >
            {i < step ? "✓ " : ""}{s}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div style={{ minHeight: 280, marginBottom: space.lg }}>
        <StepContent step={step} draft={draft} update={update} />
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: `1px solid ${color.red}40`, padding: "10px 16px", marginBottom: space.md, fontFamily: font.mono, fontSize: fontSize.caption, color: color.red }}>
          {error}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={step === 0 ? onCancel : prev}
          style={{ padding: "10px 22px", border: `1px solid ${color.border2}`, background: "transparent", color: color.white2, fontFamily: font.mono, fontSize: fontSize.caption, cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase" }}
        >
          {step === 0 ? "Cancelar" : "← Anterior"}
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={next}
            style={{ padding: "10px 22px", border: `1px solid ${color.amber}`, background: color.amber, color: color.bg, fontFamily: font.mono, fontSize: fontSize.caption, cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}
          >
            Próximo →
          </button>
        ) : (
          <button
            onClick={publish}
            disabled={loading}
            style={{ padding: "12px 32px", border: `1px solid ${color.amber}`, background: loading ? color.amberDim : color.amber, color: color.bg, fontFamily: font.mono, fontSize: fontSize.caption, cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Publicando…" : "Publicar Demanda"}
          </button>
        )}
      </div>
    </div>
  );
}
