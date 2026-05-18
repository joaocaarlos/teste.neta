/**
 * DemandsPage — demand list + management for demandantes.
 * Inline styles only.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  Plus,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { apiGetList, apiDelete } from "../../services/api";
import { normDemand } from "../../utils";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type DemandStatus =
  | "Publicado"
  | "Em cotação"
  | "Em negociação"
  | "Contratado"
  | "Finalizado"
  | "Cancelado";

interface Demand {
  id: string;
  title?: string;
  status?: DemandStatus | string;
  proposals?: number;
  proposals_count?: number;
  nda?: boolean;
  nda_required?: boolean;
  process?: string;
  urgency?: string;
  deadline?: string;
  location?: string;
  created?: string;
  created_at?: string;
}

type StatusFilter = "all" | "open" | "matching" | "closed";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const STATUS_COLORS: Record<string, string> = {
  Publicado: "var(--amber)",
  "Em cotação": "var(--blue)",
  "Em negociação": "var(--purple)",
  Contratado: "var(--green)",
  Finalizado: "var(--white3)",
  Cancelado: "var(--red)",
};

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "open", label: "Abertas" },
  { key: "matching", label: "Em cotação" },
  { key: "closed", label: "Encerradas" },
];

const OPEN_STATUSES = new Set(["Publicado"]);
const MATCHING_STATUSES = new Set(["Em cotação", "Em negociação"]);
const CLOSED_STATUSES = new Set(["Contratado", "Finalizado", "Cancelado"]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function matchesFilter(d: Demand, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  const s = d.status || "";
  if (filter === "open") return OPEN_STATUSES.has(s);
  if (filter === "matching") return MATCHING_STATUSES.has(s);
  if (filter === "closed") return CLOSED_STATUSES.has(s);
  return true;
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ label }: { label?: string }) {
  if (!label) return null;
  const color = STATUS_COLORS[label] || "var(--white3)";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        background: `${color}22`,
        color,
        border: `1px solid ${color}44`,
        fontFamily: "var(--mono)",
        fontSize: 9,
        textTransform: "uppercase",
        letterSpacing: ".06em",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

// ─── FilterPill ──────────────────────────────────────────────────────────────

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        background: active ? "var(--amber)" : "transparent",
        border: `1px solid ${active ? "var(--amber)" : "var(--border2)"}`,
        color: active ? "var(--bg)" : "var(--white2)",
        fontFamily: "var(--cond)",
        fontWeight: 700,
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: ".06em",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        padding: "18px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", gap: 8 }}>
        <div
          style={{
            height: 14,
            width: 60,
            background: "var(--bg3)",
            borderRadius: 2,
          }}
        />
        <div
          style={{
            height: 14,
            width: 80,
            background: "var(--bg3)",
            borderRadius: 2,
          }}
        />
      </div>
      <div
        style={{
          height: 18,
          width: "70%",
          background: "var(--bg3)",
          borderRadius: 2,
        }}
      />
      <div style={{ display: "flex", gap: 12 }}>
        {[100, 80, 120, 90].map((w, i) => (
          <div
            key={i}
            style={{
              height: 10,
              width: w,
              background: "var(--bg3)",
              borderRadius: 2,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── DemandCard ──────────────────────────────────────────────────────────────

function DemandCard({
  demand,
  onDelete,
}: {
  demand: Demand;
  onDelete: (d: Demand) => void;
}) {
  const proposalsCount = demand.proposals ?? demand.proposals_count ?? 0;

  return (
    <div
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        padding: "18px 22px",
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        transition: "border-color .2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor =
          "rgba(232,160,32,.3)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
      }}
    >
      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Badges row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 6,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 9,
              color: "var(--amber)",
            }}
          >
            {demand.id}
          </span>
          <StatusBadge label={demand.status} />
          {demand.nda && (
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 9,
                color: "var(--purple)",
                border: "1px solid var(--purple)44",
                padding: "2px 6px",
                background: "var(--purple)22",
              }}
            >
              NDA
            </span>
          )}
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: "var(--cond)",
            fontSize: 17,
            fontWeight: 700,
            textTransform: "uppercase",
            color: "var(--white)",
            marginBottom: 6,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {demand.title || demand.id}
        </div>

        {/* Meta */}
        <div
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          {[
            demand.process && `Processo: ${demand.process}`,
            demand.location && `Local: ${demand.location}`,
            demand.deadline && `Prazo: ${demand.deadline}`,
            fmtDate(demand.created_at) !== "—" &&
              `Criado: ${fmtDate(demand.created_at)}`,
          ]
            .filter(Boolean)
            .map((text) => (
              <span
                key={text as string}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 9,
                  color: "var(--white3)",
                }}
              >
                {text}
              </span>
            ))}
        </div>
      </div>

      {/* Right: proposals count + actions */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: "var(--cond)",
              fontSize: 26,
              fontWeight: 800,
              color: "var(--amber)",
              lineHeight: 1,
            }}
          >
            {proposalsCount}
          </div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 8,
              color: "var(--white3)",
              textTransform: "uppercase",
              letterSpacing: ".08em",
            }}
          >
            Propostas
          </div>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => {
              window.location.href = "/demandas";
            }}
            title="Ver detalhes"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 10px",
              background: "transparent",
              border: "1px solid var(--border2)",
              color: "var(--white2)",
              fontFamily: "var(--mono)",
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: ".06em",
              cursor: "pointer",
            }}
          >
            <Eye size={12} />
            Ver
          </button>
          <button
            onClick={() => onDelete(demand)}
            title="Excluir demanda"
            style={{
              display: "flex",
              alignItems: "center",
              padding: "6px 8px",
              background: "transparent",
              border: "1px solid var(--border2)",
              color: "var(--red)",
              cursor: "pointer",
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        marginTop: 20,
      }}
    >
      <button
        onClick={onPrev}
        disabled={page === 1}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "6px 10px",
          background: "transparent",
          border: "1px solid var(--border2)",
          color: page === 1 ? "var(--white3)" : "var(--white)",
          cursor: page === 1 ? "not-allowed" : "pointer",
          opacity: page === 1 ? 0.4 : 1,
        }}
      >
        <ChevronLeft size={14} />
      </button>
      <span
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          color: "var(--white3)",
          textTransform: "uppercase",
          letterSpacing: ".06em",
        }}
      >
        {page} / {totalPages}
      </span>
      <button
        onClick={onNext}
        disabled={page === totalPages}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "6px 10px",
          background: "transparent",
          border: "1px solid var(--border2)",
          color: page === totalPages ? "var(--white3)" : "var(--white)",
          cursor: page === totalPages ? "not-allowed" : "pointer",
          opacity: page === totalPages ? 0.4 : 1,
        }}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

// ─── DemandsPage ──────────────────────────────────────────────────────────────

export function DemandsPage() {
  const [allDemands, setAllDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Demand | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiGetList<Demand>("/v1/demands")
      .then((rows) => {
        if (cancelled) return;
        setAllDemands((rows || []).map(normDemand) as Demand[]);
      })
      .catch(() => {
        /* silently fail — empty state handles it */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const filtered = allDemands.filter((d) => matchesFilter(d, statusFilter));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/v1/demands/${deleteTarget.id}`);
      setAllDemands((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      /* ignore — could toast here */
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget]);

  return (
    <div
      style={{
        padding: "28px 32px",
        maxWidth: 1100,
        margin: "0 auto",
        fontFamily: "var(--body)",
      }}
    >
      {/* ─── Page header ───────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
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
              color: "var(--white)",
              margin: 0,
            }}
          >
            Minhas Demandas
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--white3)",
              marginTop: 4,
              fontFamily: "var(--mono)",
            }}
          >
            {loading
              ? "Carregando…"
              : `${filtered.length} de ${allDemands.length} demandas`}
          </p>
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

      {/* ─── Filter bar ────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        {STATUS_FILTERS.map(({ key, label }) => (
          <FilterPill
            key={key}
            label={label}
            active={statusFilter === key}
            onClick={() => setStatusFilter(key)}
          />
        ))}
      </div>

      {/* ─── Loading skeleton ───────────────────────────────────────────── */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* ─── Empty state ───────────────────────────────────────────────── */}
      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={<ClipboardList size={48} />}
          title={
            statusFilter === "all"
              ? "Nenhuma demanda criada"
              : "Nenhuma demanda nesta categoria"
          }
          message={
            statusFilter === "all"
              ? "Crie sua primeira demanda para receber propostas de fornecedores."
              : "Tente selecionar outro filtro."
          }
          action={
            statusFilter === "all"
              ? {
                  label: "Nova Demanda",
                  onClick: () => {
                    window.location.href = "/nova-demanda";
                  },
                }
              : undefined
          }
        />
      )}

      {/* ─── Demand cards ───────────────────────────────────────────────── */}
      {!loading && paginated.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {paginated.map((d) => (
            <DemandCard key={d.id} demand={d} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      {/* ─── Pagination ─────────────────────────────────────────────────── */}
      {!loading && filtered.length > PAGE_SIZE && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      )}

      {/* ─── Delete confirm dialog ───────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        variant="danger"
        title="Excluir demanda?"
        message={
          deleteTarget
            ? `"${deleteTarget.title || deleteTarget.id}" será removida permanentemente. Esta ação não pode ser desfeita.`
            : ""
        }
        confirmLabel={deleting ? "Excluindo…" : "Sim, excluir"}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default DemandsPage;
