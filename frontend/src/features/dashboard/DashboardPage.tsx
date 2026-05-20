/**
 * DashboardPage — main home screen after login.
 * Shows KPIs and recent activity for the authenticated user.
 * Inline styles only.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  Package,
  FileText,
  Bell,
  TrendingUp,
  Plus,
  ArrowRight,
  Activity,
  AlertTriangle,
  Clock,
  XCircle,
} from "lucide-react";
import { apiGetList, apiFetch } from "../../services/api";
import { normDemand, normOrder, normProposal, normNotif } from "../../utils";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../app/AuthContext";
import { OnboardingWizard } from "../onboarding/OnboardingWizard";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DemandSummary {
  id: string;
  title?: string;
  status?: string;
  proposals?: number;
  created?: string;
  created_at?: string;
}

interface OrderSummary {
  id: string;
  product?: string;
  status?: string;
  supplier?: string;
  supplier_company_name?: string;
  created_at?: string;
}

interface ProposalSummary {
  id: string;
  supplier?: string;
  supplier_name?: string;
  total?: string;
  score?: number;
  status?: string;
  created_at?: string;
}

interface NotifSummary {
  id: string;
  text?: string;
  read?: boolean;
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
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: ".1em",
            color: "var(--white3)",
          }}
        >
          {label}
        </div>
        <Icon
          size={16}
          style={{ color: color || "var(--white3)", flexShrink: 0 }}
        />
      </div>
      <div
        style={{
          fontFamily: "var(--cond)",
          fontSize: 32,
          fontWeight: 800,
          color: color || "var(--white)",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 9,
            color: "var(--white3)",
            textTransform: "uppercase",
            letterSpacing: ".06em",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

function SectionHeader({
  title,
  linkHref,
}: {
  title: string;
  linkHref: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 18px",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--cond)",
          fontSize: 14,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: ".04em",
          color: "var(--white)",
        }}
      >
        {title}
      </span>
      <button
        onClick={() => {
          window.location.href = linkHref;
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "transparent",
          border: "none",
          color: "var(--amber)",
          fontFamily: "var(--mono)",
          fontSize: 9,
          textTransform: "uppercase",
          letterSpacing: ".08em",
          cursor: "pointer",
        }}
      >
        Ver todas <ArrowRight size={10} />
      </button>
    </div>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ label }: { label?: string }) {
  if (!label) return null;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 7px",
        background: `${STATUS_COLORS[label] || "var(--white3)"}22`,
        color: STATUS_COLORS[label] || "var(--white3)",
        border: `1px solid ${STATUS_COLORS[label] || "var(--white3)"}44`,
        fontFamily: "var(--mono)",
        fontSize: 9,
        textTransform: "uppercase",
        letterSpacing: ".06em",
      }}
    >
      {label}
    </span>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div
      style={{
        padding: "12px 18px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div
        style={{
          height: 12,
          width: "60%",
          background: "var(--bg3)",
          borderRadius: 2,
        }}
      />
      <div
        style={{
          height: 9,
          width: "40%",
          background: "var(--bg3)",
          borderRadius: 2,
        }}
      />
    </div>
  );
}

// ─── RecentDemandsCard ───────────────────────────────────────────────────────

function RecentDemandsCard({
  demands,
  loading,
}: {
  demands: DemandSummary[];
  loading: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SectionHeader title="Demandas Recentes" linkHref="/demandas" />

      {loading &&
        Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}

      {!loading && demands.length === 0 && (
        <div style={{ padding: "24px 18px" }}>
          <EmptyState
            icon={<ClipboardList size={32} />}
            title="Nenhuma demanda"
            message="Crie sua primeira demanda para começar."
            action={{
              label: "Nova Demanda",
              onClick: () => {
                window.location.href = "/nova-demanda";
              },
            }}
          />
        </div>
      )}

      {!loading &&
        demands.slice(0, 5).map((d) => (
          <div
            key={d.id}
            style={{
              padding: "12px 18px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 12,
              cursor: "pointer",
            }}
            onClick={() => {
              window.location.href = "/demandas";
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--cond)",
                  fontSize: 13,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  color: "var(--white)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginBottom: 3,
                }}
              >
                {(d as DemandSummary & { title?: string }).title || d.id}
              </div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 9,
                  color: "var(--white3)",
                }}
              >
                {fmtDate(d.created_at)} ·{" "}
                {(d.proposals || 0)} propostas
              </div>
            </div>
            <StatusBadge label={d.status} />
          </div>
        ))}
    </div>
  );
}

// ─── RecentOrdersCard ────────────────────────────────────────────────────────

function RecentOrdersCard({
  orders,
  loading,
}: {
  orders: OrderSummary[];
  loading: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SectionHeader title="Pedidos Recentes" linkHref="/pedidos" />

      {loading &&
        Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}

      {!loading && orders.length === 0 && (
        <div style={{ padding: "24px 18px" }}>
          <EmptyState
            icon={<Package size={32} />}
            title="Nenhum pedido"
            message="Aceite uma proposta para gerar um pedido."
          />
        </div>
      )}

      {!loading &&
        orders.slice(0, 5).map((o) => (
          <div
            key={o.id}
            style={{
              padding: "12px 18px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 12,
              cursor: "pointer",
            }}
            onClick={() => {
              window.location.href = "/pedidos";
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--cond)",
                  fontSize: 13,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  color: "var(--white)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginBottom: 3,
                }}
              >
                {(o as OrderSummary & { product?: string }).product || o.id}
              </div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 9,
                  color: "var(--white3)",
                }}
              >
                {fmtDate(o.created_at)} ·{" "}
                {(o as OrderSummary & { supplier?: string; supplier_company_name?: string }).supplier_company_name ||
                  o.supplier ||
                  "—"}
              </div>
            </div>
            <StatusBadge label={o.status} />
          </div>
        ))}
    </div>
  );
}

// ─── RecentProposalsCard ──────────────────────────────────────────────────────

function RecentProposalsCard({
  proposals,
  loading,
}: {
  proposals: ProposalSummary[];
  loading: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SectionHeader title="Propostas Recentes" linkHref="/propostas" />

      {loading &&
        Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}

      {!loading && proposals.length === 0 && (
        <div style={{ padding: "24px 18px" }}>
          <EmptyState
            icon={<FileText size={32} />}
            title="Nenhuma proposta"
            message="As propostas recebidas aparecerão aqui."
          />
        </div>
      )}

      {!loading &&
        proposals.slice(0, 5).map((p) => (
          <div
            key={p.id}
            style={{
              padding: "12px 18px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 12,
              cursor: "pointer",
            }}
            onClick={() => {
              window.location.href = "/propostas";
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--cond)",
                  fontSize: 13,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  color: "var(--white)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginBottom: 3,
                }}
              >
                {p.supplier_name || p.supplier || "—"}
              </div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 9,
                  color: "var(--white3)",
                }}
              >
                {fmtDate(p.created_at)} · Score: {p.score ?? "—"}
              </div>
            </div>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                color: "var(--amber)",
              }}
            >
              {p.total || "—"}
            </span>
          </div>
        ))}
    </div>
  );
}

// ─── KYC Banner types ─────────────────────────────────────────────────────────

type KycOverallStatus = "incomplete" | "pending" | "approved" | "rejected";

interface KycStatusResponse {
  overall: KycOverallStatus;
  missingDocs?: string[];
  pendingDocs?: string[];
  approvedDocs?: string[];
  estimatedReviewTime?: string | null;
  lastUpdated?: string | null;
}

// ─── KycBanner ────────────────────────────────────────────────────────────────

function KycBanner({
  status,
  rejectionNote,
}: {
  status: KycOverallStatus | null;
  rejectionNote?: string | null;
}) {
  if (!status || status === "approved") return null;

  const configs: Record<
    Exclude<KycOverallStatus, "approved">,
    {
      bg: string;
      border: string;
      color: string;
      icon: React.ReactElement;
      message: string;
      actionLabel?: string;
      actionHref?: string;
    }
  > = {
    incomplete: {
      bg: "var(--amber)12",
      border: "var(--amber)40",
      color: "var(--amber)",
      icon: <AlertTriangle size={14} />,
      message: "Complete a verificação da sua empresa para acessar todos os recursos.",
      actionLabel: "Verificar agora",
      actionHref: "/verificacao",
    },
    pending: {
      bg: "var(--blue)12",
      border: "var(--blue)40",
      color: "var(--blue)",
      icon: <Clock size={14} />,
      message: "Documentos em análise — retorno em até 2 dias úteis.",
    },
    rejected: {
      bg: "var(--red)12",
      border: "var(--red)40",
      color: "var(--red)",
      icon: <XCircle size={14} />,
      message: `Verificação reprovada${rejectionNote ? `: ${rejectionNote}` : ""}.`,
      actionLabel: "Reenviar documentos",
      actionHref: "/verificacao",
    },
  };

  const cfg = configs[status as Exclude<KycOverallStatus, "approved">];
  if (!cfg) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 16px",
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        fontFamily: "var(--mono)",
        fontSize: 11,
        letterSpacing: ".04em",
        marginBottom: 20,
      }}
    >
      <span style={{ flexShrink: 0 }}>{cfg.icon}</span>
      <span style={{ flex: 1 }}>{cfg.message}</span>
      {cfg.actionLabel && cfg.actionHref && (
        <a
          href={cfg.actionHref}
          style={{
            color: cfg.color,
            fontFamily: "var(--mono)",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: ".06em",
            textDecoration: "underline",
            flexShrink: 0,
          }}
        >
          {cfg.actionLabel}
        </a>
      )}
    </div>
  );
}

// ─── DashboardPage ────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { user, updateUser } = useAuth();

  const [demands, setDemands] = useState<DemandSummary[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [proposals, setProposals] = useState<ProposalSummary[]>([]);
  const [notifications, setNotifications] = useState<NotifSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // KYC status for banner
  const [kycStatus, setKycStatus] = useState<KycOverallStatus | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      apiGetList<DemandSummary>("/v1/demands"),
      apiGetList<OrderSummary>("/v1/orders"),
      apiGetList<ProposalSummary>("/v1/proposals"),
      apiGetList<NotifSummary>("/v1/notifications"),
    ])
      .then(([dem, ord, props, notifs]) => {
        if (cancelled) return;
        setDemands((dem || []).map(normDemand) as DemandSummary[]);
        setOrders((ord || []).map(normOrder) as OrderSummary[]);
        setProposals((props || []).map(normProposal) as ProposalSummary[]);
        setNotifications(
          (notifs || []).map(normNotif) as NotifSummary[]
        );
      })
      .catch(() => {
        /* silently fail — each section shows empty state */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch KYC status for the banner
  useEffect(() => {
    if (!user?.company_id && !user?.companyId) return;
    let cancelled = false;
    apiFetch("/v1/verification/status")
      .then(async (res) => {
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { data?: KycStatusResponse };
        const payload = data.data ?? (data as unknown as KycStatusResponse);
        if (!cancelled && payload.overall) {
          setKycStatus(payload.overall);
        }
      })
      .catch(() => {
        /* silent */
      });
    return () => {
      cancelled = true;
    };
  }, [user?.company_id, user?.companyId]);

  // Show onboarding wizard for new users
  useEffect(() => {
    if (user && user.onboarding_completed !== true) {
      setShowOnboarding(true);
    }
  }, [user]);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
    updateUser({ onboarding_completed: true });
  }, [updateUser]);

  const greeting = getGreeting();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const activeDemands = demands.filter(
    (d) => d.status !== "Contratado" && d.status !== "Finalizado"
  ).length;

  return (
    <>
      {/* ─── Onboarding wizard overlay ───────────────────────────────────── */}
      {showOnboarding && (
        <OnboardingWizard onComplete={handleOnboardingComplete} />
      )}

    <div
      style={{
        padding: "28px 32px",
        maxWidth: 1200,
        margin: "0 auto",
        fontFamily: "var(--body)",
      }}
    >
      {/* ─── KYC status banner ───────────────────────────────────────────── */}
      <KycBanner status={kycStatus} />

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 28,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--cond)",
              fontSize: 30,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: ".04em",
              color: "var(--white)",
              margin: 0,
            }}
          >
            {greeting},{" "}
            <span style={{ color: "var(--amber)" }}>
              {user?.name || "Empresa"}
            </span>
          </h1>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: "var(--white3)",
              letterSpacing: ".08em",
              marginTop: 4,
            }}
          >
            {new Date()
              .toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
              .toUpperCase()}{" "}
            {user?.company ? `· ${user.company}` : ""}
          </div>
        </div>

        <button
          onClick={() => {
            window.location.href = "/nova-demanda";
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 18px",
            background: "var(--amber)",
            border: "none",
            color: "var(--bg)",
            fontFamily: "var(--cond)",
            fontWeight: 700,
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: ".06em",
            cursor: "pointer",
          }}
        >
          <Plus size={16} />
          Nova Demanda
        </button>
      </div>

      {/* ─── KPI Cards ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          marginBottom: 24,
        }}
      >
        <KpiCard
          label="Demandas ativas"
          value={loading ? "—" : activeDemands}
          sub="publicadas"
          icon={ClipboardList}
          color="var(--amber)"
        />
        <KpiCard
          label="Pedidos"
          value={loading ? "—" : orders.length}
          sub="Total"
          icon={Package}
          color="var(--blue)"
        />
        <KpiCard
          label="Propostas"
          value={loading ? "—" : proposals.length}
          sub="recebidas"
          icon={FileText}
          color="var(--purple)"
        />
        <KpiCard
          label="Notificações"
          value={loading ? "—" : unreadCount}
          sub="não lidas"
          icon={Bell}
          color={unreadCount > 0 ? "var(--red)" : "var(--white3)"}
        />
      </div>

      {/* ─── Recent activity ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <RecentDemandsCard demands={demands} loading={loading} />
        <RecentOrdersCard orders={orders} loading={loading} />
        <RecentProposalsCard proposals={proposals} loading={loading} />
      </div>

      {/* ─── Quick links ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        {[
          { label: "Acompanhamento", href: "/acompanhamento", icon: Activity },
          { label: "Propostas", href: "/propostas", icon: FileText },
          { label: "Contratos", href: "/contratos", icon: TrendingUp },
        ].map(({ label, href, icon: Icon }) => (
          <button
            key={href}
            onClick={() => {
              window.location.href = href;
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              background: "transparent",
              border: "1px solid var(--border2)",
              color: "var(--white2)",
              fontFamily: "var(--cond)",
              fontWeight: 700,
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: ".06em",
              cursor: "pointer",
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>
    </div>
    </>
  );
}

export default DashboardPage;
