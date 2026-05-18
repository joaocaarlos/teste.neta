/**
 * #22 — Executive dashboard with marketplace KPIs
 */
import React, { useEffect, useState, useCallback } from "react";
import { apiGet } from "../../services/api";
import { color, font, fontSize, space } from "../../styles/tokens";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KpiValue {
  value: number;
  change?: number | null;
}

interface KpiData {
  period: string;
  kpis: {
    gmv:               KpiValue;
    revenue:           KpiValue;
    demands:           KpiValue;
    proposals:         KpiValue;
    orders:            KpiValue;
    completed:         KpiValue;
    disputesOpen:      KpiValue;
    activeSuppliers:   KpiValue;
    demandsNoProposal: KpiValue;
    avgFirstResponseH: KpiValue;
    avgTicket:         KpiValue;
    nps:               KpiValue;
    lateOrdersRate:    KpiValue;
  };
  conversionFunnel: {
    demands:   number;
    proposals: number;
    orders:    number;
    completed: number;
  };
  generatedAt: string;
}

type Period = "7d" | "30d" | "90d";

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, change, format = "number" }: {
  label: string;
  value: number;
  change?: number | null;
  format?: "number" | "currency" | "percent" | "hours" | "rating";
}) {
  const formatValue = (v: number) => {
    if (format === "currency") {
      if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
      if (v >= 1_000)     return `R$${(v / 1_000).toFixed(0)}k`;
      return `R$${v.toFixed(0)}`;
    }
    if (format === "percent") return `${(v * 100).toFixed(1)}%`;
    if (format === "hours")   return `${v.toFixed(1)}h`;
    if (format === "rating")  return v.toFixed(1);
    return v.toLocaleString("pt-BR");
  };

  const changeColor = change == null ? color.white3 : change >= 0 ? color.green : color.red;
  const changeSign  = change != null && change > 0 ? "+" : "";

  return (
    <div style={{ background: color.bg2, border: `1px solid ${color.border}`, padding: "20px 24px" }}>
      <div style={{ fontFamily: font.mono, fontSize: fontSize.label, letterSpacing: "0.1em", textTransform: "uppercase", color: color.white3, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: font.condensed, fontSize: "36px", fontWeight: 800, color: color.amber, lineHeight: 1 }}>
        {formatValue(value)}
      </div>
      {change != null && (
        <div style={{ fontFamily: font.mono, fontSize: fontSize.label, color: changeColor, marginTop: 6 }}>
          {changeSign}{change}% vs período anterior
        </div>
      )}
    </div>
  );
}

function ConversionFunnel({ funnel }: { funnel: KpiData["conversionFunnel"] }) {
  const steps = [
    { label: "Demandas",  value: funnel.demands },
    { label: "Propostas", value: funnel.proposals },
    { label: "Pedidos",   value: funnel.orders },
    { label: "Concluídos",value: funnel.completed },
  ];
  const max = steps[0].value || 1;

  return (
    <div style={{ background: color.bg2, border: `1px solid ${color.border}`, padding: "24px" }}>
      <div style={{ fontFamily: font.mono, fontSize: fontSize.label, letterSpacing: "0.12em", textTransform: "uppercase", color: color.white3, marginBottom: 20 }}>
        Funil de Conversão
      </div>
      {steps.map((s, i) => (
        <div key={s.label} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: font.mono, fontSize: fontSize.caption, color: color.white2, marginBottom: 4 }}>
            <span>{s.label}</span>
            <span style={{ color: color.amber }}>{s.value.toLocaleString("pt-BR")}</span>
          </div>
          <div style={{ background: color.bg3, height: 8, borderRadius: 2 }}>
            <div
              style={{
                height: "100%",
                width: `${(s.value / max) * 100}%`,
                background: i === 0 ? color.amber : i === 1 ? color.amber2 : i === 2 ? color.green : color.blue,
                borderRadius: 2,
                transition: "width 0.5s ease",
              }}
            />
          </div>
          {i < steps.length - 1 && (
            <div style={{ fontFamily: font.mono, fontSize: "9px", color: color.white3, textAlign: "right", marginTop: 2 }}>
              {steps[i].value > 0
                ? `${((steps[i + 1].value / steps[i].value) * 100).toFixed(0)}% de conversão`
                : "—"}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function ExecutiveDashboard() {
  const [period, setPeriod] = useState<Period>("30d");
  const [data, setData]     = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const load = useCallback(async (p: Period) => {
    setLoading(true);
    setError(null);
    const result = await apiGet<KpiData>(`/admin/dashboard/kpis?period=${p}`);
    if (result.ok) {
      setData(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(period); }, [period, load]);

  if (loading) {
    return (
      <div style={{ padding: space.xl, fontFamily: font.mono, fontSize: fontSize.caption, color: color.white3 }}>
        Carregando KPIs…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: space.xl, fontFamily: font.mono, fontSize: fontSize.caption, color: color.red }}>
        Erro ao carregar dashboard: {error}
      </div>
    );
  }

  const { kpis, conversionFunnel } = data;

  return (
    <div style={{ padding: `${space.xl}px ${space.lg}px` }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: space.xl }}>
        <div>
          <div style={{ fontFamily: font.mono, fontSize: fontSize.label, letterSpacing: "0.2em", textTransform: "uppercase", color: color.amber, marginBottom: 8 }}>
            Painel Executivo
          </div>
          <h1 style={{ fontFamily: font.condensed, fontSize: fontSize.hero, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95, margin: 0 }}>
            KPIs do <span style={{ color: color.amber }}>Marketplace</span>
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {(["7d", "30d", "90d"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: "8px 18px",
                border: `1px solid ${period === p ? color.amber : color.border}`,
                background: period === p ? color.amberDim : "transparent",
                color: period === p ? color.amber : color.white2,
                fontFamily: font.mono,
                fontSize: fontSize.label,
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Top KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
        <KpiCard label="GMV"       value={kpis.gmv.value}     change={kpis.gmv.change}     format="currency" />
        <KpiCard label="Receita"   value={kpis.revenue.value} change={kpis.revenue.change} format="currency" />
        <KpiCard label="Pedidos"   value={kpis.orders.value}  change={kpis.orders.change} />
        <KpiCard label="Disputas"  value={kpis.disputesOpen.value} />
      </div>

      {/* Second row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <ConversionFunnel funnel={conversionFunnel} />

        {/* Operational alerts */}
        <div style={{ background: color.bg2, border: `1px solid ${color.border}`, padding: "24px" }}>
          <div style={{ fontFamily: font.mono, fontSize: fontSize.label, letterSpacing: "0.12em", textTransform: "uppercase", color: color.white3, marginBottom: 20 }}>
            Alertas Operacionais
          </div>
          {[
            { label: "Fornecedores Ativos (período)", value: kpis.activeSuppliers.value.toString(), warn: false },
            { label: "Demandas Sem Proposta",         value: kpis.demandsNoProposal.value.toString(), warn: kpis.demandsNoProposal.value > 5 },
            { label: "Taxa de Pedidos Atrasados",     value: `${(kpis.lateOrdersRate.value * 100).toFixed(1)}%`, warn: kpis.lateOrdersRate.value > 0.1 },
            { label: "Disputas Abertas",              value: kpis.disputesOpen.value.toString(), warn: kpis.disputesOpen.value > 0 },
          ].map(({ label, value, warn }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${color.border}` }}>
              <span style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: color.white2 }}>{label}</span>
              <span style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: warn ? color.red : color.green, fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <KpiCard label="Ticket Médio"        value={kpis.avgTicket.value}        format="currency" />
        <KpiCard label="Tempo 1ª Proposta"   value={kpis.avgFirstResponseH.value} format="hours" />
        <KpiCard label="NPS (avaliação)"     value={kpis.nps.value}              format="rating" />
        <KpiCard label="Demandas (período)"  value={kpis.demands.value} change={kpis.demands.change} />
      </div>

      <div style={{ fontFamily: font.mono, fontSize: "9px", color: color.white3, marginTop: space.lg, textAlign: "right" }}>
        Atualizado em: {new Date(data.generatedAt).toLocaleString("pt-BR")}
      </div>
    </div>
  );
}
