/**
 * FinancialPage — paginated transaction list with period filter and summary cards.
 * Inline styles only.
 */

import React, { useState, useEffect, useMemo } from "react";
import { DollarSign, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { apiGet } from "../../services/api";
import { normTxn } from "../../utils";
import { EmptyState } from "../../components/ui/EmptyState";
import { Transaction } from "../../types";
import { useWindowSize } from "../../hooks/useWindowSize";

// ─── Types ────────────────────────────────────────────────────────────────────

type PeriodFilter = "7d" | "30d" | "90d";

interface NormTxn extends Transaction {
  order: string;
  gross: number;
  commission: number;
  net: number;
  type: "entrada" | "saída";
  date: string;
  status: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const PERIOD_FILTERS: { key: PeriodFilter; label: string }[] = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
];

const PERIOD_DAYS: Record<PeriodFilter, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const STATUS_COLORS: Record<string, string> = {
  pendente: "var(--amber)",
  processando: "var(--blue)",
  concluído: "var(--green)",
  falhou: "var(--red)",
};

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

function fmtBRL(val: number): string {
  return val.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function normalizeTransaction(t: Transaction): NormTxn {
  const base = normTxn(t) as Transaction & { order: string; gross: number; commission: number };
  const gross = base.gross;
  const commission = base.commission;
  const net = gross - commission;
  const type: "entrada" | "saída" = gross >= 0 ? "entrada" : "saída";
  const date = t.date || t.created || "";
  const status = t.status || "pendente";
  return { ...base, net, type, date, status };
}

function isWithinPeriod(dateStr: string, days: number): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return d >= cutoff;
  } catch {
    return false;
  }
}

// ─── PeriodPill ──────────────────────────────────────────────────────────────

function PeriodPill({
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

// ─── SummaryCard ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 160,
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        padding: "18px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 9,
          color: "var(--white3)",
          textTransform: "uppercase",
          letterSpacing: ".08em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--cond)",
          fontSize: 24,
          fontWeight: 800,
          color: accent || "var(--white)",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ─── SkeletonRow ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[120, 90, 60, 80, 60].map((w, i) => (
        <td key={i} style={{ padding: "12px 16px" }}>
          <div
            style={{
              height: 12,
              width: w,
              background: "var(--bg3)",
              borderRadius: 2,
            }}
          />
        </td>
      ))}
    </tr>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ label }: { label: string }) {
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
        aria-label="Página anterior"
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
        aria-label="Próxima página"
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

// ─── FinancialPage ────────────────────────────────────────────────────────────

export function FinancialPage() {
  const { isMobile } = useWindowSize();
  const [allTxns, setAllTxns] = useState<NormTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>("30d");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiGet<Transaction[]>("/v1/transactions")
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          setError("Não foi possível carregar as transações.");
          return;
        }
        const rows = Array.isArray(result.data) ? result.data : [];
        setAllTxns(rows.map(normalizeTransaction));
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar as transações.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset page on period change
  useEffect(() => {
    setPage(1);
  }, [period]);

  const filtered = useMemo(
    () => allTxns.filter((t) => isWithinPeriod(t.date, PERIOD_DAYS[period])),
    [allTxns, period]
  );

  const summary = useMemo(() => {
    const totalBruto = filtered.reduce((s, t) => s + t.gross, 0);
    const totalComissao = filtered.reduce((s, t) => s + t.commission, 0);
    const liquido = totalBruto - totalComissao;
    return { totalBruto, totalComissao, liquido };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div
      style={{
        padding: isMobile ? "16px 12px" : "28px 32px",
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
              color: "var(--white)",
              margin: 0,
            }}
          >
            Financeiro
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
              : `${filtered.length} transações no período`}
          </p>
        </div>

        {/* Period filter pills */}
        <div style={{ display: "flex", gap: 6 }}>
          {PERIOD_FILTERS.map(({ key, label }) => (
            <PeriodPill
              key={key}
              label={label}
              active={period === key}
              onClick={() => setPeriod(key)}
            />
          ))}
        </div>
      </div>

      {/* ─── Summary cards ───────────────────────────────────────────────── */}
      {!loading && !error && (
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <SummaryCard
            label="Total bruto"
            value={fmtBRL(summary.totalBruto)}
            accent="var(--white)"
          />
          <SummaryCard
            label="Comissão plataforma"
            value={fmtBRL(summary.totalComissao)}
            accent="var(--red)"
          />
          <SummaryCard
            label="Líquido"
            value={fmtBRL(summary.liquido)}
            accent="var(--green)"
          />
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
          icon={<DollarSign size={48} />}
          title="Nenhuma transação no período"
          message="Selecione um período maior ou aguarde novas transações."
        />
      )}

      {/* ─── Transaction table ───────────────────────────────────────────── */}
      {!loading && !error && paginated.length > 0 && (
        <div
          style={{
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "var(--mono)",
              fontSize: 11,
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--border)",
                  background: "var(--bg3)",
                }}
              >
                {["Data", "Pedido", "Tipo", "Valor", "Status"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 16px",
                      textAlign: "left",
                      fontFamily: "var(--mono)",
                      fontSize: 9,
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
                      color: "var(--white3)",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((t, idx) => (
                <tr
                  key={t.id}
                  style={{
                    borderBottom:
                      idx < paginated.length - 1
                        ? "1px solid var(--border)"
                        : "none",
                    background: idx % 2 === 0 ? "transparent" : "var(--bg3)22",
                  }}
                >
                  <td style={{ padding: "12px 16px", color: "var(--white2)" }}>
                    {fmtDate(t.date)}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      color: "var(--amber)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.order || "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        color:
                          t.type === "entrada" ? "var(--green)" : "var(--red)",
                        fontFamily: "var(--mono)",
                        fontSize: 9,
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                      }}
                    >
                      {t.type === "entrada" ? "↑ entrada" : "↓ saída"}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      color: "var(--white)",
                      fontFamily: "var(--cond)",
                      fontSize: 14,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fmtBRL(t.gross)}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <StatusBadge label={t.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Loading skeleton rows */}
          {loading && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── Loading skeleton ───────────────────────────────────────────── */}
      {loading && (
        <div
          style={{
            background: "var(--bg2)",
            border: "1px solid var(--border)",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
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

export default FinancialPage;
