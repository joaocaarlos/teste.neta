/**
 * DashboardPage — role-based home screen after login.
 * Demandante: KPIs, recent proposals, top demands by proposals, bar chart.
 * Fornecedor: KPIs, market demands feed, sent proposals table, urgent demands.
 * Admin: stats summary + link to /admin.
 * Inline styles only. No external chart libraries.
 */

import React, { useState, useEffect } from "react";
import {
  ClipboardList,
  Package,
  FileText,
  TrendingUp,
  Plus,
  ArrowRight,
  Activity,
  DollarSign,
  ShoppingBag,
  BarChart2,
  AlertCircle,
  Settings,
} from "lucide-react";
import { apiGetList } from "../../services/api";
import { normDemand, normOrder, normProposal } from "../../utils";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../app/AuthContext";
import { useWindowSize } from "../../hooks/useWindowSize";
import { useI18n } from "../../i18n";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DemandSummary {
  id: string;
  title?: string;
  status?: string;
  proposals?: number;
  proposals_count?: number;
  created?: string;
  created_at?: string;
  deadline?: string;
}

interface OrderSummary {
  id: string;
  product?: string;
  status?: string;
  supplier?: string;
  supplier_company_name?: string;
  value?: string;
  value_raw?: number;
  gross?: number;
  created_at?: string;
}

interface ProposalSummary {
  id: string;
  supplier?: string;
  supplier_name?: string;
  total?: string;
  price?: number;
  score?: number;
  status?: string;
  created_at?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Publicado: "var(--amber)",
  "Em cotação": "var(--blue)",
  "Em negociação": "var(--purple)",
  Contratado: "var(--green)",
  Finalizado: "var(--white3)",
  Cancelado: "var(--red)",
  "Em produção": "var(--green)",
  "Em setup": "var(--blue)",
  Entregue: "var(--green)",
  Enviada: "var(--amber)",
  "Em análise": "var(--blue)",
  Aceita: "var(--green)",
  Recusada: "var(--red)",
};

type GreetingKey = "dashboard.greeting.morning" | "dashboard.greeting.afternoon" | "dashboard.greeting.evening";

function getGreetingKey(): GreetingKey {
  const h = new Date().getHours();
  if (h < 12) return "dashboard.greeting.morning";
  if (h < 18) return "dashboard.greeting.afternoon";
  return "dashboard.greeting.evening";
}

function fmtDate(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function hoursUntil(dateStr?: string): number {
  if (!dateStr) return Infinity;
  try {
    return (new Date(dateStr).getTime() - Date.now()) / 3_600_000;
  } catch {
    return Infinity;
  }
}

function buildWeeklyBars(
  items: { created_at?: string }[]
): { label: string; count: number }[] {
  const now = Date.now();
  return Array.from({ length: 4 }, (_, i) => {
    const start = now - (4 - i) * 7 * 24 * 3_600_000;
    const end = now - (3 - i) * 7 * 24 * 3_600_000;
    const label = new Date(start).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
    const count = items.filter((item) => {
      if (!item.created_at) return false;
      const t = new Date(item.created_at).getTime();
      return t >= start && t < end;
    }).length;
    return { label, count };
  });
}

// ─── KpiCard ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--white3)" }}>
          {label}
        </div>
        <Icon size={16} style={{ color: color || "var(--white3)", flexShrink: 0 }} />
      </div>
      <div style={{ fontFamily: "var(--cond)", fontSize: 32, fontWeight: 800, color: color || "var(--white)", lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--white3)", textTransform: "uppercase", letterSpacing: ".06em" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

function SectionHeader({ title, linkHref, linkLabel }: { title: string; linkHref: string; linkLabel?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontFamily: "var(--cond)", fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--white)" }}>
        {title}
      </span>
      <button
        onClick={() => { window.location.href = linkHref; }}
        style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "none", color: "var(--amber)", fontFamily: "var(--mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: ".08em", cursor: "pointer" }}
      >
        {linkLabel || "Ver todas"} <ArrowRight size={10} />
      </button>
    </div>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ label }: { label?: string }) {
  if (!label) return null;
  return (
    <span style={{ display: "inline-block", padding: "2px 7px", background: `${STATUS_COLORS[label] || "var(--white3)"}22`, color: STATUS_COLORS[label] || "var(--white3)", border: `1px solid ${STATUS_COLORS[label] || "var(--white3)"}44`, fontFamily: "var(--mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: ".06em" }}>
      {label}
    </span>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ height: 12, width: "60%", background: "var(--bg3)", borderRadius: 2 }} />
      <div style={{ height: 9, width: "40%", background: "var(--bg3)", borderRadius: 2 }} />
    </div>
  );
}

// ─── CSS Bar Chart ────────────────────────────────────────────────────────────

function WeeklyBarChart({ bars, title }: { bars: { label: string; count: number }[]; title: string }) {
  const maxCount = Math.max(...bars.map((b) => b.count), 1);
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", padding: "18px 20px" }}>
      <div style={{ fontFamily: "var(--cond)", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--white)", marginBottom: 18 }}>
        {title}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 80 }}>
        {bars.map((bar) => (
          <div key={bar.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--amber)" }}>{bar.count}</div>
            <div style={{ width: "100%", height: `${Math.max((bar.count / maxCount) * 60, bar.count > 0 ? 4 : 2)}px`, background: bar.count > 0 ? "var(--amber)" : "var(--border)", transition: "height .3s ease" }} />
            <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--white3)", textAlign: "center", whiteSpace: "nowrap" }}>{bar.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── QuickLinks ───────────────────────────────────────────────────────────────

function QuickLinks({ links }: { links: { label: string; href: string; icon: React.ElementType }[] }) {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {links.map(({ label, href, icon: Icon }) => (
        <button
          key={href}
          onClick={() => { window.location.href = href; }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "transparent", border: "1px solid var(--border2)", color: "var(--white2)", fontFamily: "var(--cond)", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: ".06em", cursor: "pointer" }}
        >
          <Icon size={13} />
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── DashboardDemandante ──────────────────────────────────────────────────────

function DashboardDemandante({
  demands, orders, proposals, loading, user,
}: {
  demands: DemandSummary[];
  orders: OrderSummary[];
  proposals: ProposalSummary[];
  loading: boolean;
  user: { name?: string; company?: string } | null;
}) {
  const { t } = useI18n();
  const greeting = t(getGreetingKey());
  const { isMobile } = useWindowSize();
  const publishedCount = demands.filter((d) => d.status === "Publicado").length;
  const activeOrders = orders.filter((o) => o.status !== "Finalizado" && o.status !== "Cancelado" && o.status !== "Entregue").length;
  const escrowRaw = orders.filter((o) => o.status !== "Finalizado" && o.status !== "Cancelado" && o.status !== "Entregue").reduce((sum, o) => sum + (o.value_raw || o.gross || 0), 0);
  const escrowFmt = escrowRaw > 0 ? `R$${(escrowRaw / 1000).toFixed(0)}k` : "R$ 0";
  const topDemands = [...demands].sort((a, b) => (b.proposals ?? b.proposals_count ?? 0) - (a.proposals ?? a.proposals_count ?? 0)).slice(0, 3);
  const weeklyBars = buildWeeklyBars(proposals);

  return (
    <div style={{ padding: isMobile ? "16px 12px" : "28px 32px", maxWidth: 1200, margin: "0 auto", fontFamily: "var(--body)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "var(--cond)", fontSize: isMobile ? 22 : 30, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--white)", margin: 0 }}>
            {greeting}, <span style={{ color: "var(--amber)" }}>{user?.name || "Demandante"}</span>
          </h1>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--white3)", letterSpacing: ".08em", marginTop: 4 }}>
            {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}
            {user?.company ? ` · ${user.company}` : ""}
          </div>
        </div>
        <button
          onClick={() => { window.location.href = "/nova-demanda"; }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", background: "var(--amber)", border: "none", color: "var(--bg)", fontFamily: "var(--cond)", fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: ".06em", cursor: "pointer" }}
        >
          <Plus size={16} /> {t("dashboard.new_demand")}
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 8 : 10, marginBottom: 24 }}>
        <KpiCard label={t("dashboard.kpi.published_demands")} value={loading ? "—" : publishedCount} sub="abertas no mercado" icon={ClipboardList} color="var(--amber)" />
        <KpiCard label={t("dashboard.kpi.received_proposals")} value={loading ? "—" : proposals.length} sub="no total" icon={FileText} color="var(--blue)" />
        <KpiCard label={t("dashboard.kpi.active_orders")} value={loading ? "—" : activeOrders} sub="em produção" icon={Package} color="var(--purple)" />
        <KpiCard label={t("dashboard.kpi.escrow_value")} value={loading ? "—" : escrowFmt} sub="retido na plataforma" icon={DollarSign} color="var(--green)" />
      </div>

      {/* Main grid: feed + top demands */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 24 }}>
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
          <SectionHeader title="Propostas Recebidas" linkHref="/propostas" />
          {loading && Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
          {!loading && proposals.length === 0 && (
            <div style={{ padding: "24px 18px" }}>
              <EmptyState icon={<FileText size={32} />} title="Nenhuma proposta" message="Quando fornecedores enviarem propostas elas aparecerão aqui." />
            </div>
          )}
          {!loading && proposals.slice(0, 5).map((p) => (
            <div key={p.id} style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => { window.location.href = "/propostas"; }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--cond)", fontSize: 13, fontWeight: 600, textTransform: "uppercase", color: "var(--white)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>
                  {p.supplier_name || p.supplier || "Fornecedor"}
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--white3)" }}>
                  {fmtDate(p.created_at)} · Score: {p.score ?? "—"}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--amber)" }}>{p.total || "—"}</span>
                <StatusBadge label={p.status} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
          <SectionHeader title="Top Demandas" linkHref="/demandas" linkLabel="Ver todas" />
          {loading && Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
          {!loading && topDemands.length === 0 && (
            <div style={{ padding: "24px 18px" }}>
              <EmptyState icon={<ClipboardList size={32} />} title="Nenhuma demanda" message="Crie sua primeira demanda para começar." action={{ label: "Nova Demanda", onClick: () => { window.location.href = "/nova-demanda"; } }} />
            </div>
          )}
          {!loading && topDemands.map((d, idx) => {
            const propCount = d.proposals ?? d.proposals_count ?? 0;
            return (
              <div key={d.id} style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => { window.location.href = "/demandas"; }}>
                <div style={{ fontFamily: "var(--cond)", fontSize: 24, fontWeight: 900, color: idx === 0 ? "var(--amber)" : "var(--white3)", width: 28, flexShrink: 0 }}>{idx + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--cond)", fontSize: 13, fontWeight: 600, textTransform: "uppercase", color: "var(--white)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>
                    {d.title || d.id}
                  </div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--white3)" }}>{fmtDate(d.created_at)}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: "var(--cond)", fontSize: 22, fontWeight: 800, color: "var(--amber)", lineHeight: 1 }}>{propCount}</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--white3)", textTransform: "uppercase" }}>propostas</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bar chart */}
      {!loading && <div style={{ marginBottom: 24 }}><WeeklyBarChart bars={weeklyBars} title="Propostas recebidas por semana (últimas 4 semanas)" /></div>}

      <QuickLinks links={[
        { label: "Acompanhamento", href: "/acompanhamento", icon: Activity },
        { label: "Propostas", href: "/propostas", icon: FileText },
        { label: "Contratos", href: "/contratos", icon: TrendingUp },
      ]} />
    </div>
  );
}

// ─── DashboardFornecedor ──────────────────────────────────────────────────────

function DashboardFornecedor({
  marketDemands, sentProposals, orders, loading, user,
}: {
  marketDemands: DemandSummary[];
  sentProposals: ProposalSummary[];
  orders: OrderSummary[];
  loading: boolean;
  user: { name?: string; company?: string } | null;
}) {
  const { t } = useI18n();
  const greeting = t(getGreetingKey());
  const { isMobile } = useWindowSize();
  const activeOrdersCount = orders.filter((o) => o.status !== "Finalizado" && o.status !== "Cancelado" && o.status !== "Entregue").length;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthRevenue = orders.filter((o) => { const t = o.created_at ? new Date(o.created_at).getTime() : 0; return t >= monthStart && (o.status === "Entregue" || o.status === "Finalizado"); }).reduce((sum, o) => sum + (o.value_raw || o.gross || 0), 0);
  const revenueFmt = monthRevenue > 0 ? `R$${(monthRevenue / 1000).toFixed(0)}k` : "R$ 0";
  const urgentDemands = marketDemands.filter((d) => hoursUntil(d.deadline) < 48);

  return (
    <div style={{ padding: isMobile ? "16px 12px" : "28px 32px", maxWidth: 1200, margin: "0 auto", fontFamily: "var(--body)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "var(--cond)", fontSize: isMobile ? 22 : 30, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--white)", margin: 0 }}>
            {greeting}, <span style={{ color: "var(--amber)" }}>{user?.name || "Fornecedor"}</span>
          </h1>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--white3)", letterSpacing: ".08em", marginTop: 4 }}>
            {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}
            {user?.company ? ` · ${user.company}` : ""}
          </div>
        </div>
        <button onClick={() => { window.location.href = "/demandas"; }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", background: "var(--amber)", border: "none", color: "var(--bg)", fontFamily: "var(--cond)", fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: ".06em", cursor: "pointer" }}>
          <ShoppingBag size={16} /> {t("dashboard.view_demands")}
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 8 : 10, marginBottom: 24 }}>
        <KpiCard label={t("dashboard.kpi.market_demands")} value={loading ? "—" : marketDemands.length} sub="abertas agora" icon={BarChart2} color="var(--amber)" />
        <KpiCard label={t("dashboard.kpi.sent_proposals")} value={loading ? "—" : sentProposals.length} sub="no total" icon={FileText} color="var(--blue)" />
        <KpiCard label={t("dashboard.kpi.active_orders")} value={loading ? "—" : activeOrdersCount} sub="em andamento" icon={Package} color="var(--purple)" />
        <KpiCard label={t("dashboard.kpi.monthly_revenue")} value={loading ? "—" : revenueFmt} sub="este mês" icon={DollarSign} color="var(--green)" />
      </div>

      {/* Urgent banner */}
      {!loading && urgentDemands.length > 0 && (
        <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.3)", padding: "12px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <AlertCircle size={16} style={{ color: "var(--red)", flexShrink: 0 }} />
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--red)", letterSpacing: ".06em", textTransform: "uppercase" }}>
            {urgentDemands.length} demanda{urgentDemands.length > 1 ? "s" : ""} com prazo em menos de 48h —{" "}
            <button onClick={() => { window.location.href = "/demandas"; }} style={{ background: "transparent", border: "none", color: "var(--red)", fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
              Responder agora
            </button>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 24 }}>
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
          <SectionHeader title="Demandas Abertas" linkHref="/demandas" linkLabel="Ver mercado" />
          {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
          {!loading && marketDemands.length === 0 && (
            <div style={{ padding: "24px 18px" }}>
              <EmptyState icon={<ClipboardList size={32} />} title="Nenhuma demanda aberta" message="Novas demandas publicadas aparecerão aqui." />
            </div>
          )}
          {!loading && marketDemands.slice(0, 5).map((d) => {
            const hrs = hoursUntil(d.deadline);
            const isUrgent = hrs < 48;
            return (
              <div key={d.id} style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", borderLeft: isUrgent ? "3px solid var(--red)" : "3px solid transparent" }} onClick={() => { window.location.href = "/demandas"; }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--cond)", fontSize: 13, fontWeight: 600, textTransform: "uppercase", color: "var(--white)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>
                    {d.title || d.id}
                  </div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: isUrgent ? "var(--red)" : "var(--white3)" }}>
                    {isUrgent ? `Urgente: ${Math.round(hrs)}h restantes` : fmtDate(d.created_at)}
                  </div>
                </div>
                <StatusBadge label={d.status} />
              </div>
            );
          })}
        </div>

        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
          <SectionHeader title="Minhas Propostas" linkHref="/propostas" />
          {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
          {!loading && sentProposals.length === 0 && (
            <div style={{ padding: "24px 18px" }}>
              <EmptyState icon={<FileText size={32} />} title="Nenhuma proposta enviada" message="Envie propostas para demandas abertas no mercado." action={{ label: "Ver demandas", onClick: () => { window.location.href = "/demandas"; } }} />
            </div>
          )}
          {!loading && sentProposals.slice(0, 5).map((p) => (
            <div key={p.id} style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => { window.location.href = "/propostas"; }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--amber)", marginBottom: 3 }}>{p.id}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--white3)" }}>{fmtDate(p.created_at)}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--amber)" }}>
                  {p.total || (p.price ? `R$ ${Number(p.price).toLocaleString("pt-BR")}` : "—")}
                </span>
                <StatusBadge label={p.status} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <QuickLinks links={[
        { label: "Meus Pedidos", href: "/pedidos", icon: Package },
        { label: "Acompanhamento", href: "/acompanhamento", icon: Activity },
        { label: "Contratos", href: "/contratos", icon: TrendingUp },
      ]} />
    </div>
  );
}

// ─── DashboardAdmin ───────────────────────────────────────────────────────────

function DashboardAdmin({ demands, orders, loading, user }: { demands: DemandSummary[]; orders: OrderSummary[]; loading: boolean; user: { name?: string } | null }) {
  const { t } = useI18n();
  const greeting = t(getGreetingKey());
  const { isMobile } = useWindowSize();
  return (
    <div style={{ padding: isMobile ? "16px 12px" : "28px 32px", maxWidth: 1200, margin: "0 auto", fontFamily: "var(--body)" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--cond)", fontSize: isMobile ? 22 : 30, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--white)", margin: 0 }}>
          {greeting}, <span style={{ color: "var(--amber)" }}>{user?.name || "Admin"}</span>
        </h1>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--white3)", letterSpacing: ".08em", marginTop: 4 }}>Painel Administrativo</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: isMobile ? 8 : 10, marginBottom: 28 }}>
        <KpiCard label="Total de demandas" value={loading ? "—" : demands.length} sub="na plataforma" icon={ClipboardList} color="var(--amber)" />
        <KpiCard label="Total de pedidos" value={loading ? "—" : orders.length} sub="gerados" icon={Package} color="var(--blue)" />
        <KpiCard label="Demandas publicadas" value={loading ? "—" : demands.filter((d) => d.status === "Publicado").length} sub="abertas agora" icon={Activity} color="var(--green)" />
      </div>
      <button onClick={() => { window.location.href = "/admin"; }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 28px", background: "var(--amber)", border: "none", color: "var(--bg)", fontFamily: "var(--cond)", fontWeight: 700, fontSize: 14, textTransform: "uppercase", letterSpacing: ".06em", cursor: "pointer" }}>
        <Settings size={18} /> {t("dashboard.admin_panel")}
      </button>
    </div>
  );
}

// ─── DashboardPage ────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { user } = useAuth();

  const [demands, setDemands] = useState<DemandSummary[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [proposals, setProposals] = useState<ProposalSummary[]>([]);
  const [marketDemands, setMarketDemands] = useState<DemandSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    if (user?.role === "fornecedor") {
      Promise.all([
        apiGetList<DemandSummary>("/v1/demands?status=published&limit=5"),
        apiGetList<ProposalSummary>("/v1/proposals"),
        apiGetList<OrderSummary>("/v1/orders"),
      ])
        .then(([mkt, props, ords]) => {
          if (cancelled) return;
          setMarketDemands((mkt || []).map(normDemand) as DemandSummary[]);
          setProposals((props || []).map(normProposal) as ProposalSummary[]);
          setOrders((ords || []).map(normOrder) as OrderSummary[]);
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoading(false); });
    } else {
      Promise.all([
        apiGetList<DemandSummary>("/v1/demands"),
        apiGetList<OrderSummary>("/v1/orders"),
        apiGetList<ProposalSummary>("/v1/proposals"),
      ])
        .then(([dem, ord, props]) => {
          if (cancelled) return;
          setDemands((dem || []).map(normDemand) as DemandSummary[]);
          setOrders((ord || []).map(normOrder) as OrderSummary[]);
          setProposals((props || []).map(normProposal) as ProposalSummary[]);
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoading(false); });
    }

    return () => { cancelled = true; };
  }, [user?.role]);

  if (user?.role === "fornecedor") {
    return <DashboardFornecedor marketDemands={marketDemands} sentProposals={proposals} orders={orders} loading={loading} user={user} />;
  }

  if (user?.role === "admin") {
    return <DashboardAdmin demands={demands} orders={orders} loading={loading} user={user} />;
  }

  return <DashboardDemandante demands={demands} orders={orders} proposals={proposals} loading={loading} user={user} />;
}

export default DashboardPage;
