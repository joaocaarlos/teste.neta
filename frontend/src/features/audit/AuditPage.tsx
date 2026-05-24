/**
 * AuditPage — Admin audit log viewer
 * Route: /auditoria/*
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../../services/api";
import { useAuth } from "../../app/AuthContext";
import { color, font, fontSize, space } from "../../styles/tokens";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AuditEntry {
  id: string;
  timestamp?: string;
  created_at?: string;
  action: string;
  user_email?: string;
  user_id?: string;
  resource_type?: string;
  resource_id?: string;
  details?: string | Record<string, unknown>;
  ip?: string;
}

type SortKey = "timestamp" | "action" | "user_email" | "resource_type";
type SortDir = "asc" | "desc";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function entryDate(e: AuditEntry): string {
  const raw = e.timestamp ?? e.created_at;
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleString("pt-BR");
  } catch {
    return raw;
  }
}

function entryDateMs(e: AuditEntry): number {
  const raw = e.timestamp ?? e.created_at;
  return raw ? new Date(raw).getTime() : 0;
}

function sortEntries(entries: AuditEntry[], key: SortKey, dir: SortDir): AuditEntry[] {
  return [...entries].sort((a, b) => {
    let cmp = 0;
    if (key === "timestamp") {
      cmp = entryDateMs(a) - entryDateMs(b);
    } else {
      const av = (a[key] ?? "").toString().toLowerCase();
      const bv = (b[key] ?? "").toString().toLowerCase();
      cmp = av < bv ? -1 : av > bv ? 1 : 0;
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

// ─── Main component ────────────────────────────────────────────────────────────

export function AuditPage() {
  const { user, authLoading } = useAuth();
  const navigate = useNavigate();

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (user.role !== "admin") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await apiGet<AuditEntry[] | { entries: AuditEntry[]; logs?: AuditEntry[] }>("/v1/audit");
    if (result.ok) {
      const raw = result.data;
      if (Array.isArray(raw)) {
        setEntries(raw);
      } else {
        setEntries(raw.entries ?? raw.logs ?? []);
      }
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user?.role === "admin") void load();
  }, [user, load]);

  if (authLoading || !user || user.role !== "admin") return null;

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function sortIndicator(key: SortKey) {
    if (key !== sortKey) return null;
    return <span style={{ marginLeft: 4, color: color.amber }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  const filtered = entries.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.action.toLowerCase().includes(q) ||
      (e.user_email ?? "").toLowerCase().includes(q) ||
      (e.resource_type ?? "").toLowerCase().includes(q) ||
      (e.resource_id ?? "").toLowerCase().includes(q)
    );
  });

  const sorted = sortEntries(filtered, sortKey, sortDir);

  const headerStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "10px 14px",
    color: color.white3,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    fontSize: "9px",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ padding: `${space.xl}px ${space.lg}px` }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: space.xl }}>
        <div>
          <div style={{ fontFamily: font.mono, fontSize: fontSize.label, letterSpacing: "0.2em", textTransform: "uppercase", color: color.amber, marginBottom: 8 }}>
            Admin
          </div>
          <h1 style={{ fontFamily: font.condensed, fontSize: fontSize.hero, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95, margin: 0 }}>
            Log de <span style={{ color: color.amber }}>Auditoria</span>
          </h1>
        </div>
        <button
          onClick={() => void load()}
          style={{
            padding: "8px 18px",
            border: `1px solid ${color.border}`,
            background: "transparent",
            color: color.white2,
            fontFamily: font.mono,
            fontSize: fontSize.label,
            cursor: "pointer",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Atualizar
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: space.lg }}>
        <input
          type="text"
          placeholder="Filtrar por ação, usuário, recurso…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            maxWidth: 420,
            padding: "10px 14px",
            background: color.bg2,
            border: `1px solid ${color.border}`,
            color: color.white,
            fontFamily: font.mono,
            fontSize: fontSize.body,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {loading && (
        <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: color.white3 }}>
          Carregando logs de auditoria…
        </div>
      )}

      {error && (
        <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: color.red, marginBottom: space.md }}>
          Erro ao carregar auditoria: {error}
          <button
            onClick={() => void load()}
            style={{ marginLeft: 12, color: color.amber, background: "none", border: "none", cursor: "pointer", fontFamily: font.mono, fontSize: fontSize.caption }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div style={{ fontFamily: font.mono, fontSize: "9px", color: color.white3, marginBottom: 12 }}>
            {sorted.length} registro{sorted.length !== 1 ? "s" : ""}{search && ` (filtrado de ${entries.length})`}
          </div>

          {sorted.length === 0 ? (
            <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: color.white3, padding: space.xl, textAlign: "center", border: `1px dashed ${color.border}` }}>
              {search ? "Nenhum registro encontrado para o filtro." : "Nenhum log de auditoria disponível."}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: font.mono, fontSize: fontSize.caption }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${color.border}` }}>
                    <th style={headerStyle} onClick={() => handleSort("timestamp")}>
                      Data/Hora{sortIndicator("timestamp")}
                    </th>
                    <th style={headerStyle} onClick={() => handleSort("action")}>
                      Ação{sortIndicator("action")}
                    </th>
                    <th style={headerStyle} onClick={() => handleSort("user_email")}>
                      Usuário{sortIndicator("user_email")}
                    </th>
                    <th style={headerStyle} onClick={() => handleSort("resource_type")}>
                      Tipo de Recurso{sortIndicator("resource_type")}
                    </th>
                    <th style={headerStyle}>
                      ID do Recurso
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((e, idx) => (
                    <tr
                      key={e.id}
                      style={{
                        borderBottom: `1px solid ${color.border}`,
                        background: idx % 2 === 0 ? "transparent" : color.bg2,
                      }}
                    >
                      <td style={{ padding: "10px 14px", color: color.white3, whiteSpace: "nowrap" }}>
                        {entryDate(e)}
                      </td>
                      <td style={{ padding: "10px 14px", color: color.white, fontWeight: 600, letterSpacing: "0.04em" }}>
                        {e.action}
                      </td>
                      <td style={{ padding: "10px 14px", color: color.white2 }}>
                        {e.user_email ?? e.user_id ?? "—"}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        {e.resource_type ? (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              border: `1px solid ${color.border2}`,
                              color: color.blue,
                              fontSize: "9px",
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                            }}
                          >
                            {e.resource_type}
                          </span>
                        ) : (
                          <span style={{ color: color.white3 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 14px", color: color.white3, fontFamily: font.mono, fontSize: "9px" }}>
                        {e.resource_id ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AuditPage;
