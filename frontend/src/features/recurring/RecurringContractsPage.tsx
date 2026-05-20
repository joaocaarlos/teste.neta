import React, { useState, useEffect, useCallback } from "react";
import { Repeat, Plus, FileText, AlertCircle, DollarSign, Eye, RefreshCw, Download, Wrench, Layers, Calendar, Shield } from "lucide-react";
import { apiFetch, apiGetList } from "../../services/api";
import { useAuth } from "../../app/AuthContext";
import { useNavigate } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecurringContract {
  id: string;
  status: "active" | "paused" | "cancelled" | string;
  frequency: string;
  description: string;
  buyer_company_id: string;
  supplier_company_id: string;
  next_due_at?: string;
  auto_create?: boolean;
  created_at?: string;
  updated_at?: string;
  // LegacyApp-compatible display fields
  tipo?: string;
  demandante?: string;
  processo?: string;
  volume?: string;
  valor?: string;
  sla?: string;
  inicio?: string;
  vigencia?: string;
  renovacao?: string;
  cumprimento?: number[];
}

interface FormState {
  tipo: string;
  demandante: string;
  processo: string;
  volume: string;
  valor: string;
  sla: string;
  inicio: string;
  vigencia: string;
  renovacao: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  active: "var(--green)",
  Ativo: "var(--green)",
  paused: "var(--orange)",
  Pausado: "var(--orange)",
  cancelled: "var(--red)",
  Cancelado: "var(--red)",
};

const TIPO_COLORS: Record<string, string> = {
  "Mensal fixo": "var(--green)",
  "Capacidade reservada": "var(--blue)",
  Emergencial: "var(--orange)",
  "Por volume": "var(--purple)",
};

const FREQ_MAP: Record<string, string> = {
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal fixo",
  quarterly: "Trimestral",
};

const EMPTY_FORM: FormState = {
  tipo: "Mensal fixo",
  demandante: "",
  processo: "",
  volume: "",
  valor: "",
  sla: "",
  inicio: "",
  vigencia: "",
  renovacao: "Automática",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtStatus(s: string): string {
  if (s === "active") return "Ativo";
  if (s === "paused") return "Pausado";
  if (s === "cancelled") return "Cancelado";
  return s;
}

function exportCSV(rows: object[], filename: string): void {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => JSON.stringify((r as Record<string, unknown>)[k] ?? "")).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `${filename}.csv`;
  a.click();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color = "var(--amber)" }: { label: string; value: string | number; sub?: string; icon: React.ElementType; color?: string }) {
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Icon size={14} color={color} />
        <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--white3)", textTransform: "uppercase", letterSpacing: ".1em" }}>{label}</span>
      </div>
      <div style={{ fontFamily: "var(--cond)", fontSize: 26, fontWeight: 800, color }}>{value}</div>
      {sub && <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--white3)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Badge({ label, color = "var(--white3)" }: { label: string; color?: string }) {
  return (
    <span style={{ fontFamily: "var(--mono)", fontSize: 9, color, border: `1px solid ${color}`, padding: "2px 7px", borderRadius: 2, textTransform: "uppercase", letterSpacing: ".05em" }}>
      {label}
    </span>
  );
}

function Btn({ children, onClick, icon: Icon, variant = "primary", small = false, disabled = false }: { children?: React.ReactNode; onClick?: () => void; icon?: React.ElementType; variant?: "primary" | "ghost" | "green"; small?: boolean; disabled?: boolean }) {
  const bg = variant === "primary" ? "var(--amber)" : variant === "green" ? "var(--green)" : "transparent";
  const color = variant === "ghost" ? "var(--white3)" : "#000";
  const border = variant === "ghost" ? "1px solid var(--border)" : "none";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ display: "flex", alignItems: "center", gap: 6, background: bg, color, border, padding: small ? "6px 12px" : "10px 18px", fontFamily: "var(--mono)", fontSize: small ? 9 : 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
    >
      {Icon && <Icon size={small ? 11 : 13} />}
      {children}
    </button>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--white3)", textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</span>
      <div style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{children}</div>
    </label>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({ contract, onClose, onExport }: { contract: RecurringContract; onClose: () => void; onExport: (c: RecurringContract) => void }) {
  const fields: [string, string][] = [
    ["Tipo", contract.tipo || FREQ_MAP[contract.frequency] || contract.frequency],
    ["Status", fmtStatus(contract.status)],
    ["Empresa", contract.demandante || contract.buyer_company_id],
    ["Processo", contract.processo || contract.description],
    ["Volume", contract.volume || "—"],
    ["Valor", contract.valor || "—"],
    ["Início", contract.inicio || contract.created_at?.slice(0, 10) || "—"],
    ["Fim vigência", contract.vigencia || contract.next_due_at?.slice(0, 10) || "—"],
    ["SLA", contract.sla || "—"],
    ["Renovação", contract.renovacao || (contract.auto_create ? "Automática" : "Manual")],
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", padding: 28, width: 580, maxWidth: "90vw", maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "var(--cond)", fontSize: 18, fontWeight: 800, textTransform: "uppercase" }}>
            Detalhes · <span style={{ color: "var(--amber)", fontFamily: "var(--mono)", fontSize: 12 }}>{contract.id}</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--white3)", cursor: "pointer", fontSize: 20 }}>×</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          {fields.map(([k, v]) => (
            <div key={k} style={{ padding: "10px 14px", background: "var(--bg3)" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--white3)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 3 }}>{k}</div>
              <div style={{ fontFamily: "var(--cond)", fontSize: 14, fontWeight: 700 }}>{v}</div>
            </div>
          ))}
        </div>
        {contract.cumprimento && (
          <div style={{ padding: "14px 16px", background: "var(--bg3)", border: "1px solid var(--border)", marginBottom: 14 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--white3)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>Histórico de cumprimento mensal</div>
            <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 48 }}>
              {contract.cumprimento.map((v, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: "var(--white3)" }}>{v}%</span>
                  <div style={{ width: "100%", background: "rgba(232,160,32,.15)", borderTop: "2px solid var(--amber)", height: `${(v / 100) * 40}px` }} />
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={onClose}>Fechar</Btn>
          <Btn icon={Download} onClick={() => onExport(contract)}>Exportar</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function RecurringContractsPage() {
  const { user, authLoading } = useAuth();
  const navigate = useNavigate();

  const [contracts, setContracts] = useState<RecurringContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<RecurringContract | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGetList("/recurring");
      setContracts(data as RecurringContract[]);
    } catch {
      setError("Erro ao carregar contratos recorrentes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const upForm = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submitForm = async () => {
    if (!form.demandante || !form.processo) {
      alert("Preencha ao menos empresa e processo.");
      return;
    }
    setSubmitting(true);
    try {
      const freqMap: Record<string, string> = { "Mensal fixo": "monthly", "Capacidade reservada": "monthly", "Por volume": "monthly", Emergencial: "weekly", Trimestral: "quarterly" };
      const body = {
        description: `${form.processo} — ${form.demandante}`,
        frequency: freqMap[form.tipo] || "monthly",
        next_due_at: form.vigencia || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        auto_create: form.renovacao === "Automática",
        // keep display fields for UI
        tipo: form.tipo,
        demandante: form.demandante,
        processo: form.processo,
        volume: form.volume,
        valor: form.valor ? `R$ ${form.valor}/mês` : "",
        sla: form.sla,
        inicio: form.inicio,
        vigencia: form.vigencia,
        renovacao: form.renovacao,
      };
      const res = await apiFetch("/recurring", { method: "POST", body: JSON.stringify(body) });
      const created = await res.json();
      setContracts((prev) => [created, ...prev]);
      setShowForm(false);
      setForm(EMPTY_FORM);
    } catch {
      alert("Erro ao criar contrato recorrente.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (c: RecurringContract) => {
    setTogglingId(c.id);
    try {
      const newStatus = c.status === "active" || c.status === "Ativo" ? "paused" : "active";
      const res = await apiFetch(`/recurring/${c.id}`, { method: "PATCH", body: JSON.stringify({ status: newStatus }) });
      const updated = await res.json();
      setContracts((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...updated } : x)));
    } catch {
      alert("Erro ao atualizar status.");
    } finally {
      setTogglingId(null);
    }
  };

  const ativos = contracts.filter((c) => c.status === "active" || c.status === "Ativo");
  const pausados = contracts.filter((c) => c.status === "paused" || c.status === "Pausado");
  const receitaTotal = ativos.reduce((acc, c) => {
    const v = parseInt((c.valor || "0").replace(/\D/g, "")) || 0;
    return acc + v;
  }, 0);

  if (authLoading || loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--white3)" }}>Carregando contratos…</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "var(--cond)", fontSize: 30, fontWeight: 800, textTransform: "uppercase", margin: 0 }}>
            Contratos <span style={{ color: "var(--amber)" }}>Recorrentes</span>
          </h1>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--white3)", marginTop: 3 }}>
            {ativos.length} contrato{ativos.length !== 1 ? "s" : ""} ativo{ativos.length !== 1 ? "s" : ""}
          </div>
        </div>
        <Btn icon={Plus} onClick={() => setShowForm((v) => !v)}>Novo Contrato Recorrente</Btn>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 20 }}>
        <StatCard label="Contratos ativos" value={ativos.length} icon={Repeat} color="var(--green)" />
        <StatCard label="Total contratos" value={contracts.length} icon={FileText} color="var(--amber)" />
        <StatCard label="Pausados" value={pausados.length} icon={AlertCircle} color="var(--orange)" />
        <StatCard label="Receita recorrente" value={receitaTotal > 0 ? `R$${(receitaTotal / 1000).toFixed(0)}k` : "—"} sub="/mês garantido" icon={DollarSign} color="var(--green)" />
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: "rgba(239,68,68,.1)", border: "1px solid var(--red)", padding: "12px 16px", marginBottom: 16, fontFamily: "var(--mono)", fontSize: 11, color: "var(--red)" }}>
          {error}
        </div>
      )}

      {/* New contract form */}
      {showForm && (
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", padding: 24, marginBottom: 20 }}>
          <div style={{ fontFamily: "var(--cond)", fontSize: 17, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 18 }}>Novo Contrato Recorrente</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <FormField label="Tipo de contrato">
              <select value={form.tipo} onChange={upForm("tipo")} style={{ width: "100%", background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--white)", padding: "8px 10px", fontFamily: "var(--mono)", fontSize: 11 }}>
                {["Mensal fixo", "Capacidade reservada", "Por volume", "Emergencial"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </FormField>
            <FormField label="Empresa contratante *">
              <input value={form.demandante} onChange={upForm("demandante")} placeholder="Nome da empresa demandante" style={{ width: "100%", background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--white)", padding: "8px 10px", fontFamily: "var(--mono)", fontSize: 11, boxSizing: "border-box" }} />
            </FormField>
            <FormField label="Processo / Máquina *">
              <input value={form.processo} onChange={upForm("processo")} placeholder="Ex: Torneamento CNC – Romi Centur 30D" style={{ width: "100%", background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--white)", padding: "8px 10px", fontFamily: "var(--mono)", fontSize: 11, boxSizing: "border-box" }} />
            </FormField>
            <FormField label="Volume / Capacidade">
              <input value={form.volume} onChange={upForm("volume")} placeholder="Ex: 5.000 pçs/mês" style={{ width: "100%", background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--white)", padding: "8px 10px", fontFamily: "var(--mono)", fontSize: 11, boxSizing: "border-box" }} />
            </FormField>
            <FormField label="Valor mensal (R$)">
              <input value={form.valor} onChange={upForm("valor")} placeholder="Ex: 24500" type="number" min="0" style={{ width: "100%", background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--white)", padding: "8px 10px", fontFamily: "var(--mono)", fontSize: 11, boxSizing: "border-box" }} />
            </FormField>
            <FormField label="SLA de entrega">
              <input value={form.sla} onChange={upForm("sla")} placeholder="Ex: 98% entregas no prazo" style={{ width: "100%", background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--white)", padding: "8px 10px", fontFamily: "var(--mono)", fontSize: 11, boxSizing: "border-box" }} />
            </FormField>
            <FormField label="Vigência — início">
              <input type="date" value={form.inicio} onChange={upForm("inicio")} style={{ width: "100%", background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--white)", padding: "8px 10px", fontFamily: "var(--mono)", fontSize: 11, boxSizing: "border-box" }} />
            </FormField>
            <FormField label="Vigência — fim">
              <input type="date" value={form.vigencia} onChange={upForm("vigencia")} style={{ width: "100%", background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--white)", padding: "8px 10px", fontFamily: "var(--mono)", fontSize: 11, boxSizing: "border-box" }} />
            </FormField>
          </div>
          <FormField label="Renovação">
            <select value={form.renovacao} onChange={upForm("renovacao")} style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--white)", padding: "8px 10px", fontFamily: "var(--mono)", fontSize: 11 }}>
              <option>Automática</option>
              <option>Manual</option>
            </select>
          </FormField>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Btn>
            <Btn icon={FileText} onClick={submitForm} disabled={submitting}>{submitting ? "Salvando…" : "Gerar Contrato Recorrente"}</Btn>
          </div>
        </div>
      )}

      {/* Contract list */}
      {contracts.length === 0 && !loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--white3)", fontFamily: "var(--mono)", fontSize: 11 }}>
          <Repeat size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div>Nenhum contrato recorrente cadastrado.</div>
          <div style={{ marginTop: 8, fontSize: 10 }}>Clique em "Novo Contrato Recorrente" para começar.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {contracts.map((c) => {
            const tipo = c.tipo || FREQ_MAP[c.frequency] || c.frequency;
            const isActive = c.status === "active" || c.status === "Ativo";
            return (
              <div key={c.id} style={{ background: "var(--bg2)", border: "1px solid var(--border)", padding: "20px 24px" }}>
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--amber)" }}>{c.id}</span>
                      <Badge label={tipo} color={TIPO_COLORS[tipo] || "var(--amber)"} />
                      <Badge label={fmtStatus(c.status)} color={STATUS_COLORS[c.status] || "var(--white3)"} />
                      {c.renovacao && <Badge label={`Renov: ${c.renovacao}`} color="var(--white3)" />}
                    </div>
                    <div style={{ fontFamily: "var(--cond)", fontSize: 17, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
                      {c.demandante || c.description}
                    </div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      {([
                        [Wrench, c.processo],
                        [Layers, c.volume],
                        [DollarSign, c.valor],
                        [Calendar, c.inicio && c.vigencia ? `${c.inicio}→${c.vigencia}` : c.next_due_at],
                        [Shield, c.sla],
                      ] as [React.ElementType, string | undefined][]).filter(([, t]) => t).map(([Icon, text]) => (
                        <span key={text} style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--white3)", display: "flex", alignItems: "center", gap: 5 }}>
                          <Icon size={10} />{text}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <Btn small variant="ghost" icon={Eye} onClick={() => setDetail(c)}>Detalhes</Btn>
                    <Btn
                      small
                      variant={isActive ? "ghost" : "green"}
                      icon={isActive ? AlertCircle : RefreshCw}
                      onClick={() => toggleStatus(c)}
                      disabled={togglingId === c.id}
                    >
                      {togglingId === c.id ? "…" : isActive ? "Pausar" : "Reativar"}
                    </Btn>
                  </div>
                </div>
                {c.cumprimento && (
                  <div style={{ marginTop: 14, background: "var(--bg3)", padding: "12px 16px" }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--white3)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 6 }}>Histórico de cumprimento de SLA</div>
                    <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 32 }}>
                      {c.cumprimento.map((v, i) => (
                        <div key={i} style={{ flex: 1, background: "rgba(232,160,32,.15)", borderTop: "2px solid var(--amber)", height: `${v}%` }} />
                      ))}
                    </div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--white3)", marginTop: 4 }}>últimos {c.cumprimento.length} meses</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <DetailModal
          contract={detail}
          onClose={() => setDetail(null)}
          onExport={(c) => exportCSV([c], `contrato_recorrente_${c.id}`)}
        />
      )}
    </div>
  );
}

export default RecurringContractsPage;
