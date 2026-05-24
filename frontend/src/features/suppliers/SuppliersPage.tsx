/**
 * SuppliersPage — supplier marketplace search and filter.
 * Inline styles only.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Star,
  ShieldCheck,
  Search,
} from "lucide-react";
import { apiFetch } from "../../services/api";
import { EmptyState } from "../../components/ui/EmptyState";
import { useWindowSize } from "../../hooks/useWindowSize";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortOption = "relevance" | "rating" | "price";

interface SupplierResult {
  id: string;
  name: string;
  city?: string;
  state?: string;
  processes?: string[];
  avg_rating?: number;
  trust_badge?: boolean;
  monthly_capacity?: number;
  completed_orders?: number;
  logo_url?: string | null;
}

interface FilterState {
  process: string;
  material: string;
  state: string;
  minRating: string;
  certification: string;
  minCapacity: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const BR_STATES = [
  "", "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "relevance", label: "Relevância" },
  { key: "rating", label: "Avaliação" },
  { key: "price", label: "Preço" },
];

const EMPTY_FILTERS: FilterState = {
  process: "",
  material: "",
  state: "",
  minRating: "",
  certification: "",
  minCapacity: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildQueryString(
  filters: FilterState,
  page: number,
  sort: SortOption
): string {
  const params = new URLSearchParams();
  if (filters.process) params.set("process", filters.process);
  if (filters.material) params.set("material", filters.material);
  if (filters.state) params.set("state", filters.state);
  if (filters.minRating) params.set("minRating", filters.minRating);
  if (filters.certification) params.set("certification", filters.certification);
  if (filters.minCapacity) params.set("minCapacity", filters.minCapacity);
  params.set("page", String(page));
  params.set("limit", String(PAGE_SIZE));
  params.set("sort", sort);
  return params.toString();
}

// ─── StarRating ──────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating?: number }) {
  const val = Math.round(rating || 0);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={12}
          fill={i < val ? "var(--amber)" : "transparent"}
          stroke={i < val ? "var(--amber)" : "var(--white3)"}
        />
      ))}
      {rating !== undefined && (
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 9,
            color: "var(--white3)",
            marginLeft: 4,
          }}
        >
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

// ─── SidebarInput ────────────────────────────────────────────────────────────

function SidebarInput({
  label,
  value,
  onChange,
  placeholder,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label
        style={{
          fontFamily: "var(--mono)",
          fontSize: 9,
          textTransform: "uppercase",
          letterSpacing: ".08em",
          color: "var(--white3)",
        }}
      >
        {label}
      </label>
      <input
        type={type || "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: "var(--bg3)",
          border: "1px solid var(--border2)",
          color: "var(--white)",
          fontFamily: "var(--mono)",
          fontSize: "16px",
          padding: "6px 8px",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

// ─── SidebarSelect ────────────────────────────────────────────────────────────

function SidebarSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label
        style={{
          fontFamily: "var(--mono)",
          fontSize: 9,
          textTransform: "uppercase",
          letterSpacing: ".08em",
          color: "var(--white3)",
        }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: "var(--bg3)",
          border: "1px solid var(--border2)",
          color: "var(--white)",
          fontFamily: "var(--mono)",
          fontSize: 11,
          padding: "6px 8px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
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
      <div
        style={{ height: 18, width: "60%", background: "var(--bg3)", borderRadius: 2 }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        {[80, 60].map((w, i) => (
          <div
            key={i}
            style={{ height: 12, width: w, background: "var(--bg3)", borderRadius: 2 }}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {[100, 70, 90].map((w, i) => (
          <div
            key={i}
            style={{ height: 10, width: w, background: "var(--bg3)", borderRadius: 2 }}
          />
        ))}
      </div>
      <div
        style={{ height: 30, width: 90, background: "var(--bg3)", borderRadius: 2 }}
      />
    </div>
  );
}

// ─── SupplierCard ─────────────────────────────────────────────────────────────

function SupplierCard({ supplier }: { supplier: SupplierResult }) {
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
      {/* Name + trust badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            fontFamily: "var(--cond)",
            fontSize: 17,
            fontWeight: 700,
            textTransform: "uppercase",
            color: "var(--white)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {supplier.name}
        </div>
        {supplier.trust_badge && (
          <span title="Fornecedor verificado" style={{ display: "inline-flex" }}>
            <ShieldCheck size={16} color="var(--green)" />
          </span>
        )}
      </div>

      {/* Location */}
      {(supplier.city || supplier.state) && (
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 9,
            color: "var(--white3)",
          }}
        >
          {[supplier.city, supplier.state].filter(Boolean).join(", ")}
        </div>
      )}

      {/* Processes */}
      {supplier.processes && supplier.processes.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {supplier.processes.slice(0, 4).map((p) => (
            <span
              key={p}
              style={{
                fontFamily: "var(--mono)",
                fontSize: 9,
                padding: "2px 6px",
                background: "var(--blue)22",
                border: "1px solid var(--blue)44",
                color: "var(--blue)",
                textTransform: "uppercase",
              }}
            >
              {p}
            </span>
          ))}
          {supplier.processes.length > 4 && (
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 9,
                color: "var(--white3)",
              }}
            >
              +{supplier.processes.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Rating */}
      <StarRating rating={supplier.avg_rating} />

      {/* Stats */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {supplier.monthly_capacity !== undefined && (
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 9,
              color: "var(--white3)",
            }}
          >
            Capacidade: {supplier.monthly_capacity.toLocaleString("pt-BR")}/mês
          </span>
        )}
        {supplier.completed_orders !== undefined && (
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 9,
              color: "var(--white3)",
            }}
          >
            Pedidos concluídos: {supplier.completed_orders}
          </span>
        )}
      </div>

      {/* Action */}
      <div>
        <button
          onClick={() => {
            window.location.href = `/empresas/${supplier.id}`;
          }}
          style={{
            padding: "7px 14px",
            background: "transparent",
            border: "1px solid var(--border2)",
            color: "var(--white2)",
            fontFamily: "var(--cond)",
            fontWeight: 700,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: ".06em",
            cursor: "pointer",
          }}
        >
          Ver perfil
        </button>
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

// ─── SuppliersPage ────────────────────────────────────────────────────────────

export function SuppliersPage() {
  const { isMobile } = useWindowSize();
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [activeFilters, setActiveFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortOption>("relevance");
  const [suppliers, setSuppliers] = useState<SupplierResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchSuppliers = useCallback(
    async (f: FilterState, p: number, s: SortOption) => {
      setLoading(true);
      setError(null);
      try {
        const qs = buildQueryString(f, p, s);
        const res = await apiFetch(`/v1/marketplace/suppliers?${qs}`);
        if (!res.ok) {
          setError("Não foi possível carregar os fornecedores.");
          setSuppliers([]);
          setTotal(0);
          return;
        }
        const json = await res.json();
        // Support { data: [], meta: { total } } or plain array
        if (Array.isArray(json)) {
          setSuppliers(json);
          setTotal(json.length);
        } else if (json && Array.isArray(json.data)) {
          setSuppliers(json.data);
          setTotal(json.meta?.total ?? json.data.length);
        } else {
          setSuppliers([]);
          setTotal(0);
        }
      } catch {
        setError("Não foi possível carregar os fornecedores.");
        setSuppliers([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    fetchSuppliers(activeFilters, page, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sort]);

  const handleFilter = useCallback(() => {
    setPage(1);
    setActiveFilters(filters);
    fetchSuppliers(filters, 1, sort);
  }, [filters, sort, fetchSuppliers]);

  const setField = useCallback(
    <K extends keyof FilterState>(key: K) =>
      (val: string) =>
        setFilters((prev) => ({ ...prev, [key]: val })),
    []
  );

  const stateOptions = BR_STATES.map((s) => ({
    value: s,
    label: s === "" ? "Todos os estados" : s,
  }));

  const ratingOptions = [
    { value: "", label: "Qualquer avaliação" },
    { value: "1", label: "≥ 1 estrela" },
    { value: "2", label: "≥ 2 estrelas" },
    { value: "3", label: "≥ 3 estrelas" },
    { value: "4", label: "≥ 4 estrelas" },
    { value: "5", label: "5 estrelas" },
  ];

  return (
    <div
      style={{
        padding: isMobile ? "16px 12px" : "28px 32px",
        maxWidth: 1300,
        margin: "0 auto",
        fontFamily: "var(--body)",
      }}
    >
      {/* ─── Page header ───────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
          gap: 16,
          flexWrap: "wrap",
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
            Fornecedores
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
              ? "Buscando…"
              : `${total} fornecedores encontrados`}
          </p>
        </div>

        {/* Sort selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: ".08em",
              color: "var(--white3)",
            }}
          >
            Ordenar:
          </span>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as SortOption);
              setPage(1);
            }}
            style={{
              background: "var(--bg2)",
              border: "1px solid var(--border2)",
              color: "var(--white)",
              fontFamily: "var(--mono)",
              fontSize: 11,
              padding: "6px 10px",
            }}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── Main layout: sidebar + results ─────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 20, alignItems: "flex-start" }}>
        {/* ─── Filter sidebar ────────────────────────────────────────────── */}
        <div
          style={{
            width: isMobile ? "100%" : 220,
            flexShrink: 0,
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            padding: "18px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div
            style={{
              fontFamily: "var(--cond)",
              fontSize: 13,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".06em",
              color: "var(--white)",
              marginBottom: 2,
            }}
          >
            Filtros
          </div>

          <SidebarInput
            label="Processo"
            value={filters.process}
            onChange={setField("process")}
            placeholder="ex: estampagem"
          />

          <SidebarInput
            label="Material"
            value={filters.material}
            onChange={setField("material")}
            placeholder="ex: aço inox"
          />

          <SidebarSelect
            label="Estado"
            value={filters.state}
            onChange={setField("state")}
            options={stateOptions}
          />

          <SidebarSelect
            label="Avaliação mínima"
            value={filters.minRating}
            onChange={setField("minRating")}
            options={ratingOptions}
          />

          <SidebarInput
            label="Certificação"
            value={filters.certification}
            onChange={setField("certification")}
            placeholder="ex: ISO 9001"
          />

          <SidebarInput
            label="Capacidade mín. (un/mês)"
            value={filters.minCapacity}
            onChange={setField("minCapacity")}
            type="number"
            placeholder="ex: 1000"
          />

          <button
            onClick={handleFilter}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "9px 14px",
              background: "var(--amber)",
              border: "none",
              color: "var(--bg)",
              fontFamily: "var(--cond)",
              fontWeight: 700,
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: ".06em",
              cursor: "pointer",
              marginTop: 4,
            }}
          >
            <Search size={14} />
            Filtrar
          </button>
        </div>

        {/* ─── Results area ──────────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Loading skeletons */}
          {loading && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 12,
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Error */}
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

          {/* Empty state */}
          {!loading && !error && suppliers.length === 0 && (
            <EmptyState
              icon={<Building2 size={48} />}
              title="Nenhum fornecedor encontrado"
              message="Tente ajustar os filtros para ampliar a busca."
            />
          )}

          {/* Supplier cards grid */}
          {!loading && !error && suppliers.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 12,
              }}
            >
              {suppliers.map((s) => (
                <SupplierCard key={s.id} supplier={s} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && total > PAGE_SIZE && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default SuppliersPage;
