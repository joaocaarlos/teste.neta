/**
 * DemandKanbanPage — CRM-style kanban board for demands.
 * Inline styles only. No Tailwind/CSS modules.
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiGetList } from "../../services/api";
import { normDemand } from "../../utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Demand {
  id: string;
  title?: string;
  status?: string;
  proposals?: number;
  proposals_count?: number;
  company_name?: string;
  deadline?: string;
  deadline_at?: string;
  created_at?: string;
}

// ─── Column definitions ───────────────────────────────────────────────────────

interface KanbanColumn {
  id: string;
  label: string;
  statuses: string[];
}

const COLUMNS: KanbanColumn[] = [
  { id: "rascunho",     label: "Rascunho",       statuses: ["rascunho", "Rascunho"] },
  { id: "publicada",    label: "Publicada",       statuses: ["publicada", "aberta", "Publicado", "Aberta"] },
  { id: "em_cotacao",   label: "Em Cotação",      statuses: ["em_cotacao", "Em cotação", "Em Cotação"] },
  { id: "em_negociacao",label: "Em Negociação",   statuses: ["em_negociacao", "Em negociação", "Em Negociação"] },
  { id: "contratada",   label: "Contratada",      statuses: ["contratada", "Contratado", "Contratada"] },
  { id: "finalizada",   label: "Finalizada",      statuses: ["finalizada", "concluida", "Finalizado", "Finalizada", "Concluído"] },
];

const FINISHED_IDS = new Set(["finalizada"]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDeadlineText(deadlineStr?: string): string | null {
  if (!deadlineStr) return null;
  try {
    const deadline = new Date(deadlineStr);
    if (isNaN(deadline.getTime())) return null;
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 0) return `em ${diffDays} dia${diffDays !== 1 ? "s" : ""}`;
    if (diffDays === 0) return "hoje";
    return `venceu há ${Math.abs(diffDays)} dia${Math.abs(diffDays) !== 1 ? "s" : ""}`;
  } catch {
    return null;
  }
}

function isUrgent(deadlineStr?: string, columnId?: string): boolean {
  if (!deadlineStr || FINISHED_IDS.has(columnId || "")) return false;
  try {
    const deadline = new Date(deadlineStr);
    if (isNaN(deadline.getTime())) return false;
    const diffMs = deadline.getTime() - Date.now();
    return diffMs > 0 && diffMs <= 48 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function groupByColumn(demands: Demand[]): Record<string, Demand[]> {
  const groups: Record<string, Demand[]> = {};
  for (const col of COLUMNS) groups[col.id] = [];

  for (const d of demands) {
    const status = (d.status || "").toLowerCase().trim();
    let placed = false;
    for (const col of COLUMNS) {
      if (col.statuses.some((s) => s.toLowerCase() === status)) {
        groups[col.id].push(d);
        placed = true;
        break;
      }
    }
    if (!placed) {
      // Fallback to "publicada" column for unknown statuses
      groups["publicada"].push(d);
    }
  }
  return groups;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      style={{
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ height: 14, width: "80%", background: "var(--border)", borderRadius: 3 }} />
      <div style={{ height: 10, width: "50%", background: "var(--border)", borderRadius: 3 }} />
      <div style={{ height: 10, width: "60%", background: "var(--border)", borderRadius: 3 }} />
    </div>
  );
}

function SkeletonColumn() {
  return (
    <div
      style={{
        minWidth: 260,
        maxWidth: 280,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* header */}
      <div
        style={{
          height: 34,
          background: "var(--border)",
          borderRadius: 6,
          marginBottom: 4,
        }}
      />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

// ─── DemandCard ───────────────────────────────────────────────────────────────

function DemandCard({
  demand,
  columnId,
  onClick,
}: {
  demand: Demand;
  columnId: string;
  onClick: () => void;
}) {
  const proposals = demand.proposals ?? demand.proposals_count ?? 0;
  const deadlineField = demand.deadline_at || demand.deadline;
  const deadlineText = getDeadlineText(deadlineField);
  const urgent = isUrgent(deadlineField, columnId);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      style={{
        background: "var(--bg)",
        border: `1px solid var(--border)`,
        borderLeft: urgent ? "3px solid #ef4444" : "1px solid var(--border)",
        borderRadius: 8,
        padding: 12,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        transition: "border-color .15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--amber)";
        if (urgent) (e.currentTarget as HTMLDivElement).style.borderLeftColor = "#ef4444";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
        if (urgent) (e.currentTarget as HTMLDivElement).style.borderLeftColor = "#ef4444";
      }}
    >
      {/* Title */}
      <div
        style={{
          fontFamily: "var(--cond)",
          fontWeight: 700,
          fontSize: 13,
          color: "var(--text, var(--white))",
          lineHeight: 1.35,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          textTransform: "uppercase",
          letterSpacing: ".03em",
        }}
      >
        {demand.title || demand.id}
      </div>

      {/* Company */}
      {demand.company_name && (
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 9,
            color: "var(--muted, var(--white3))",
            textOverflow: "ellipsis",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          {demand.company_name}
        </div>
      )}

      {/* Bottom row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 2,
          gap: 6,
        }}
      >
        {/* Proposals badge */}
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 9,
            padding: "2px 7px",
            borderRadius: 20,
            background: proposals > 0 ? "var(--amber)" : "var(--border)",
            color: proposals > 0 ? "var(--bg)" : "var(--muted, var(--white3))",
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          {proposals} proposta{proposals !== 1 ? "s" : ""}
        </span>

        {/* Deadline */}
        {deadlineText && (
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 9,
              color: urgent ? "#ef4444" : "var(--muted, var(--white3))",
              whiteSpace: "nowrap",
            }}
          >
            {deadlineText}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── KanbanColumn ─────────────────────────────────────────────────────────────

function KanbanColumn({
  column,
  demands,
  onCardClick,
}: {
  column: KanbanColumn;
  demands: Demand[];
  onCardClick: (id: string) => void;
}) {
  return (
    <div
      style={{
        minWidth: 260,
        maxWidth: 280,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Column header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 10px",
          marginBottom: 8,
          background: "var(--border)",
          borderRadius: 6,
        }}
      >
        <span
          style={{
            fontFamily: "var(--cond)",
            fontWeight: 700,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: ".06em",
            color: "var(--text, var(--white))",
          }}
        >
          {column.label}
        </span>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            color: "var(--muted, var(--white3))",
            background: "rgba(0,0,0,.2)",
            borderRadius: 20,
            padding: "1px 7px",
          }}
        >
          {demands.length}
        </span>
      </div>

      {/* Column body */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxHeight: "65vh",
          overflowY: "auto",
          paddingRight: 2,
        }}
      >
        {demands.length === 0 && (
          <div
            style={{
              padding: "20px 12px",
              textAlign: "center",
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: "var(--muted, var(--white3))",
              border: "1px dashed var(--border)",
              borderRadius: 8,
            }}
          >
            Nenhuma demanda
          </div>
        )}
        {demands.map((d) => (
          <DemandCard
            key={d.id}
            demand={d}
            columnId={column.id}
            onClick={() => onCardClick(d.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── ViewToggle ───────────────────────────────────────────────────────────────

function ViewToggle({ navigate }: { navigate: (path: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button
        onClick={() => navigate("/demandas")}
        style={{
          padding: "7px 14px",
          background: "transparent",
          border: "1px solid var(--border)",
          color: "var(--muted, var(--white3))",
          fontFamily: "var(--cond)",
          fontWeight: 700,
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: ".06em",
          cursor: "pointer",
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <span>📋</span> Lista
      </button>
      <button
        style={{
          padding: "7px 14px",
          background: "var(--amber)",
          border: "1px solid var(--amber)",
          color: "var(--bg)",
          fontFamily: "var(--cond)",
          fontWeight: 700,
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: ".06em",
          cursor: "default",
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
        disabled
      >
        <span>⊞</span> Kanban
      </button>
    </div>
  );
}

// ─── DemandKanbanPage ─────────────────────────────────────────────────────────

export function DemandKanbanPage() {
  const navigate = useNavigate();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiGetList<Demand>("/v1/demands")
      .then((rows) => {
        if (cancelled) return;
        setDemands((rows || []).map(normDemand) as Demand[]);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const grouped = groupByColumn(demands);

  const handleCardClick = (id: string) => {
    navigate(`/demandas/${id}`);
  };

  return (
    <div
      style={{
        padding: "28px 32px",
        fontFamily: "var(--body)",
        minHeight: "100vh",
      }}
    >
      {/* Page header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--cond)",
              fontSize: 28,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: ".04em",
              color: "var(--text, var(--white))",
              margin: 0,
            }}
          >
            Pipeline de Demandas
          </h1>
          <p
            style={{
              fontSize: 12,
              color: "var(--muted, var(--white3))",
              marginTop: 4,
              fontFamily: "var(--mono)",
            }}
          >
            {loading ? "Carregando…" : `${demands.length} demandas`}
          </p>
        </div>
        <ViewToggle navigate={navigate} />
      </div>

      {/* Board */}
      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          padding: 16,
          paddingLeft: 0,
          paddingRight: 0,
          alignItems: "flex-start",
        }}
      >
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonColumn key={i} />)
          : COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                demands={grouped[col.id] || []}
                onCardClick={handleCardClick}
              />
            ))}
      </div>
    </div>
  );
}

export default DemandKanbanPage;
