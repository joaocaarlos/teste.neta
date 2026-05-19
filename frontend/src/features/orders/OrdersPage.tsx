/**
 * OrdersPage — order list + management for the current user's company.
 * Inline styles only.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Package,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { apiGetList, apiPost } from "../../services/api";
import { normOrder } from "../../utils";
import { EmptyState } from "../../components/ui/EmptyState";
import { Order, OrderStatus } from "../../types";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter =
  | "all"
  | "Em produção"
  | "Em transporte"
  | "Entregue"
  | "Cancelado";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const STATUS_COLORS: Record<string, string> = {
  Publicado: "var(--amber)",
  "Em cotação": "var(--blue)",
  Contratado: "var(--purple)",
  "Em setup": "var(--purple)",
  "Em produção": "var(--blue)",
  "Em inspeção": "var(--amber)",
  "Aguardando coleta": "var(--amber)",
  "Em transporte": "var(--blue)",
  Entregue: "var(--green)",
  Finalizado: "var(--white3)",
  Cancelado: "var(--red)",
};

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "Em produção", label: "Em produção" },
  { key: "Em transporte", label: "Em transporte" },
  { key: "Entregue", label: "Entregue" },
  { key: "Cancelado", label: "Cancelado" },
];

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

function fmtValue(val?: string | number): string {
  if (!val) return "—";
  if (typeof val === "string") return val;
  return `R$ ${Number(val).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function matchesFilter(o: Order, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  return o.status === (filter as OrderStatus);
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
          style={{ height: 14, width: 60, background: "var(--bg3)", borderRadius: 2 }}
        />
        <div
          style={{ height: 14, width: 80, background: "var(--bg3)", borderRadius: 2 }}
        />
      </div>
      <div
        style={{ height: 18, width: "70%", background: "var(--bg3)", borderRadius: 2 }}
      />
      <div style={{ display: "flex", gap: 12 }}>
        {[100, 80, 120, 90].map((w, i) => (
          <div
            key={i}
            style={{ height: 10, width: w, background: "var(--bg3)", borderRadius: 2 }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── DisputePrompt ────────────────────────────────────────────────────────────

function DisputePrompt({
  onConfirm,
  onCancel,
}: {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div
      style={{
        marginTop: 8,
        padding: "12px 14px",
        background: "var(--bg3)",
        border: "1px solid var(--red)44",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Descreva o motivo da disputa…"
        rows={3}
        style={{
          background: "var(--bg2)",
          border: "1px solid var(--border2)",
          color: "var(--white)",
          fontFamily: "var(--mono)",
          fontSize: 11,
          padding: "8px 10px",
          resize: "vertical",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{
            padding: "6px 12px",
            background: "transparent",
            border: "1px solid var(--border2)",
            color: "var(--white2)",
            fontFamily: "var(--mono)",
            fontSize: 10,
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          onClick={() => reason.trim() && onConfirm(reason.trim())}
          disabled={!reason.trim()}
          style={{
            padding: "6px 14px",
            background: "var(--red)",
            border: "none",
            color: "var(--white)",
            fontFamily: "var(--cond)",
            fontWeight: 700,
            fontSize: 11,
            textTransform: "uppercase",
            cursor: reason.trim() ? "pointer" : "not-allowed",
            opacity: reason.trim() ? 1 : 0.5,
          }}
        >
          Abrir Disputa
        </button>
      </div>
    </div>
  );
}

// ─── OrderCard ────────────────────────────────────────────────────────────────

function OrderCard({
  order,
  onApprove,
  onDispute,
}: {
  order: Order;
  onApprove: (id: string) => Promise<void>;
  onDispute: (id: string, reason: string) => Promise<void>;
}) {
  const [approving, setApproving] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [disputing, setDisputing] = useState(false);

  const handleApprove = useCallback(async () => {
    setApproving(true);
    try {
      await onApprove(order.id);
    } finally {
      setApproving(false);
    }
  }, [onApprove, order.id]);

  const handleDispute = useCallback(
    async (reason: string) => {
      setDisputing(true);
      try {
        await onDispute(order.id, reason);
        setShowDispute(false);
      } finally {
        setDisputing(false);
      }
    },
    [onDispute, order.id]
  );

  return (
    <div
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        padding: "18px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
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
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
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
              {order.id}
            </span>
            <StatusBadge label={order.status} />
          </div>

          {/* Product */}
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
            {order.product || order.id}
          </div>

          {/* Meta */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {[
              order.supplier && `Fornecedor: ${order.supplier}`,
              order.client && `Cliente: ${order.client}`,
              order.deadline && `Prazo: ${fmtDate(order.deadline)}`,
              order.created && `Criado: ${fmtDate(order.created)}`,
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

        {/* Right: value + actions */}
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
                fontSize: 22,
                fontWeight: 800,
                color: "var(--amber)",
                lineHeight: 1,
              }}
            >
              {fmtValue(order.value || order.value_raw)}
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
              Valor
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button
              onClick={() => {
                window.location.href = `/pedidos/${order.id}`;
              }}
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
              Ver
            </button>

            {order.status === "Em inspeção" && (
              <button
                onClick={handleApprove}
                disabled={approving}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 10px",
                  background: "var(--green)",
                  border: "none",
                  color: "var(--white)",
                  fontFamily: "var(--cond)",
                  fontWeight: 700,
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  cursor: approving ? "not-allowed" : "pointer",
                  opacity: approving ? 0.6 : 1,
                }}
              >
                <CheckCircle size={12} />
                {approving ? "Aprovando…" : "Aprovar entrega"}
              </button>
            )}

            {order.status === "Entregue" && (
              <button
                onClick={() => setShowDispute((v) => !v)}
                disabled={disputing}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 10px",
                  background: "transparent",
                  border: "1px solid var(--red)88",
                  color: "var(--red)",
                  fontFamily: "var(--cond)",
                  fontWeight: 700,
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  cursor: "pointer",
                }}
              >
                <AlertTriangle size={12} />
                Abrir disputa
              </button>
            )}
          </div>
        </div>
      </div>

      {showDispute && (
        <DisputePrompt
          onConfirm={handleDispute}
          onCancel={() => setShowDispute(false)}
        />
      )}
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

// ─── OrdersPage ───────────────────────────────────────────────────────────────

export function OrdersPage() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiGetList<Order>("/v1/orders")
      .then((rows) => {
        if (cancelled) return;
        setAllOrders((rows || []).map(normOrder) as Order[]);
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar os pedidos.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const handleApprove = useCallback(async (id: string) => {
    await apiPost(`/v1/orders/${id}/approve`, {});
    setAllOrders((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, status: "Entregue" as const } : o
      )
    );
  }, []);

  const handleDispute = useCallback(async (id: string, reason: string) => {
    await apiPost(`/v1/orders/${id}/dispute`, { reason });
  }, []);

  const filtered = allOrders.filter((o) => matchesFilter(o, statusFilter));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
            Meus Pedidos
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
              : `${filtered.length} de ${allOrders.length} pedidos`}
          </p>
        </div>
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

      {/* ─── Loading skeleton ────────────────────────────────────────────── */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* ─── Error state ─────────────────────────────────────────────────── */}
      {!loading && error && (
        <div
          style={{
            padding: "20px 24px",
            background: "var(--red)22",
            border: "1px solid var(--red)44",
            color: "var(--red)",
            fontFamily: "var(--mono)",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {/* ─── Empty state ─────────────────────────────────────────────────── */}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={<Package size={48} />}
          title={
            statusFilter === "all"
              ? "Nenhum pedido encontrado"
              : "Nenhum pedido nesta categoria"
          }
          message={
            statusFilter === "all"
              ? "Quando uma proposta for aceita, o pedido aparece aqui."
              : "Tente selecionar outro filtro."
          }
        />
      )}

      {/* ─── Order cards ────────────────────────────────────────────────── */}
      {!loading && !error && paginated.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {paginated.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              onApprove={handleApprove}
              onDispute={handleDispute}
            />
          ))}
        </div>
      )}

      {/* ─── Pagination ─────────────────────────────────────────────────── */}
      {!loading && !error && filtered.length > PAGE_SIZE && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      )}
    </div>
  );
}

export default OrdersPage;
