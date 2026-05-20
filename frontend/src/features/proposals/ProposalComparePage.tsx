/**
 * ProposalComparePage — Compare multiple proposals side by side
 * Route: /comparar/*
 * Reads proposal IDs from ?ids=id1,id2,...
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../../services/api";
import { useAuth } from "../../app/AuthContext";
import { color, font, fontSize, space } from "../../styles/tokens";
import type { Proposal } from "../../types";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ProposalDetail extends Proposal {
  demand_title?: string;
  timeline?: string;
  payment_terms?: string;
}

interface FetchState {
  loading: boolean;
  error: string | null;
  data: ProposalDetail | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function supplierName(p: ProposalDetail): string {
  if (p.supplier_name) return p.supplier_name;
  if (p.supplier) return p.supplier;
  if (p.company) {
    if (typeof p.company === "string") return p.company;
    return p.company.name ?? "—";
  }
  return "—";
}

function formatPrice(p: ProposalDetail): string {
  const val = p.price ?? p.unit_price ?? (p.total ? parseFloat(p.total) : null);
  if (val == null) return "—";
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatTimeline(p: ProposalDetail): string {
  if (p.timeline) return p.timeline;
  if (p.lead_time_days != null) return `${p.lead_time_days} dias`;
  if (p.days != null) return `${p.days} dias`;
  return "—";
}

function formatRating(p: ProposalDetail): string {
  const val = p.rating ?? (p.company && typeof p.company !== "string" ? p.company.rating : undefined);
  if (val == null) return "—";
  return val.toFixed(1);
}

function Cell({ value, highlight }: { value: string; highlight?: boolean }) {
  return (
    <td
      style={{
        padding: "14px 16px",
        borderRight: `1px solid ${color.border}`,
        borderBottom: `1px solid ${color.border}`,
        color: highlight ? color.amber : color.white2,
        fontFamily: font.mono,
        fontSize: fontSize.body,
        verticalAlign: "top",
        fontWeight: highlight ? 700 : 400,
      }}
    >
      {value}
    </td>
  );
}

// ─── Proposal fetch hook ───────────────────────────────────────────────────────

async function fetchProposal(id: string): Promise<ProposalDetail> {
  const res = await apiFetch(`/v1/proposals/${id}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Erro ao carregar proposta ${id}`);
  }
  const json = await res.json();
  return (json?.data ?? json) as ProposalDetail;
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ProposalComparePage() {
  const { user, authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [states, setStates] = useState<FetchState[]>([]);
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const load = useCallback(async (proposalIds: string[]) => {
    const initial: FetchState[] = proposalIds.map(() => ({ loading: true, error: null, data: null }));
    setStates(initial);

    const results = await Promise.allSettled(proposalIds.map((id) => fetchProposal(id)));

    setStates(
      results.map((r) => {
        if (r.status === "fulfilled") {
          return { loading: false, error: null, data: r.value };
        }
        return { loading: false, error: (r.reason as Error).message, data: null };
      })
    );
  }, []);

  useEffect(() => {
    if (!user) return;
    const raw = searchParams.get("ids") ?? "";
    const parsed = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setIds(parsed);
    if (parsed.length > 0) {
      void load(parsed);
    }
  }, [user, searchParams, load]);

  if (authLoading || !user) return null;

  const isLoading = states.some((s) => s.loading);
  const proposals = states.map((s) => s.data);
  const errors = states.filter((s) => s.error);

  if (ids.length === 0) {
    return (
      <div style={{ padding: `${space.xl}px ${space.lg}px` }}>
        <div style={{ fontFamily: font.mono, fontSize: fontSize.label, letterSpacing: "0.2em", textTransform: "uppercase", color: color.amber, marginBottom: 8 }}>
          Comparação
        </div>
        <h1 style={{ fontFamily: font.condensed, fontSize: fontSize.hero, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95, margin: "0 0 24px 0" }}>
          Comparar <span style={{ color: color.amber }}>Propostas</span>
        </h1>
        <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: color.white3, padding: space.xl, textAlign: "center", border: `1px dashed ${color.border}` }}>
          Nenhuma proposta selecionada. Use o parâmetro <code style={{ color: color.amber }}>?ids=id1,id2</code> na URL.
        </div>
      </div>
    );
  }

  const rows: Array<{ label: string; values: string[]; highlight?: boolean }> = [
    {
      label: "Fornecedor",
      values: proposals.map((p) => (p ? supplierName(p) : "—")),
    },
    {
      label: "Preço Total",
      values: proposals.map((p) => (p ? formatPrice(p) : "—")),
      highlight: true,
    },
    {
      label: "Prazo",
      values: proposals.map((p) => (p ? formatTimeline(p) : "—")),
    },
    {
      label: "Avaliação",
      values: proposals.map((p) => (p ? formatRating(p) : "—")),
    },
    {
      label: "Pagamento",
      values: proposals.map((p) => p?.payment_terms ?? p?.payment ?? "—"),
    },
    {
      label: "Status",
      values: proposals.map((p) => p?.status ?? "—"),
    },
    {
      label: "Observações",
      values: proposals.map((p) => p?.obs ?? p?.notes ?? "—"),
    },
  ];

  return (
    <div style={{ padding: `${space.xl}px ${space.lg}px` }}>
      {/* Header */}
      <div style={{ marginBottom: space.xl }}>
        <div style={{ fontFamily: font.mono, fontSize: fontSize.label, letterSpacing: "0.2em", textTransform: "uppercase", color: color.amber, marginBottom: 8 }}>
          Comparação
        </div>
        <h1 style={{ fontFamily: font.condensed, fontSize: fontSize.hero, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95, margin: 0 }}>
          Comparar <span style={{ color: color.amber }}>Propostas</span>
        </h1>
      </div>

      {errors.length > 0 && (
        <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: color.red, marginBottom: space.md }}>
          {errors.map((s, i) => (
            <div key={i}>Erro: {s.error}</div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: color.white3 }}>
          Carregando propostas…
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: color.bg2, borderBottom: `2px solid ${color.border}` }}>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px 16px",
                    fontFamily: font.mono,
                    fontSize: "9px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: color.white3,
                    borderRight: `1px solid ${color.border}`,
                    width: 160,
                  }}
                >
                  Campo
                </th>
                {ids.map((id, i) => (
                  <th
                    key={id}
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontFamily: font.mono,
                      fontSize: "9px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: color.amber,
                      borderRight: `1px solid ${color.border}`,
                    }}
                  >
                    {states[i]?.data?.demand_title ?? `Proposta ${i + 1}`}
                    <div style={{ color: color.white3, marginTop: 2 }}>#{id.slice(-6)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <td
                    style={{
                      padding: "12px 16px",
                      borderRight: `1px solid ${color.border}`,
                      borderBottom: `1px solid ${color.border}`,
                      fontFamily: font.mono,
                      fontSize: "9px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: color.white3,
                      background: color.bg2,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.label}
                  </td>
                  {row.values.map((v, i) => (
                    <Cell key={i} value={v} highlight={row.highlight} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ProposalComparePage;
