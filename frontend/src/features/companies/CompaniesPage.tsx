/**
 * CompaniesPage — Admin page: list all companies
 * Route: /empresas/*
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../../services/api";
import { useAuth } from "../../app/AuthContext";
import { color, font, fontSize, space } from "../../styles/tokens";
import type { CompanyStatus } from "../../types";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Company {
  id: string;
  name: string;
  cnpj?: string;
  status: CompanyStatus;
  verification_status?: string;
  verified?: boolean;
  created_at?: string;
  email?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Aprovado:    "var(--green)",
  Pendente:    "var(--amber)",
  "Em análise": "var(--blue)",
  Reprovado:   "var(--red)",
  Suspenso:    "var(--orange)",
};

function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? color.white3;
}

function formatCNPJ(cnpj?: string): string {
  if (!cnpj) return "—";
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return cnpj;
}

// ─── Main component ────────────────────────────────────────────────────────────

export function CompaniesPage() {
  const { user, authLoading } = useAuth();
  const navigate = useNavigate();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    const result = await apiGet<Company[] | { companies: Company[] }>("/v1/admin/companies");
    if (result.ok) {
      const raw = result.data;
      setCompanies(Array.isArray(raw) ? raw : (raw.companies ?? []));
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user?.role === "admin") void load();
  }, [user, load]);

  if (authLoading || !user || user.role !== "admin") return null;

  const filtered = companies.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.cnpj ?? "").includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: `${space.xl}px ${space.lg}px` }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: space.xl }}>
        <div>
          <div style={{ fontFamily: font.mono, fontSize: fontSize.label, letterSpacing: "0.2em", textTransform: "uppercase", color: color.amber, marginBottom: 8 }}>
            Admin
          </div>
          <h1 style={{ fontFamily: font.condensed, fontSize: fontSize.hero, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95, margin: 0 }}>
            Gestão de <span style={{ color: color.amber }}>Empresas</span>
          </h1>
        </div>
        <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: color.white3 }}>
          {companies.length} empresa{companies.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: space.lg }}>
        <input
          type="text"
          placeholder="Buscar por nome, CNPJ ou e-mail…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            maxWidth: 400,
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
          Carregando empresas…
        </div>
      )}

      {error && (
        <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: color.red, marginBottom: space.md }}>
          Erro ao carregar empresas: {error}
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
          {filtered.length === 0 ? (
            <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: color.white3, padding: space.xl, textAlign: "center", border: `1px dashed ${color.border}` }}>
              {search ? "Nenhuma empresa encontrada para a busca." : "Nenhuma empresa cadastrada."}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: font.mono, fontSize: fontSize.caption }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${color.border}` }}>
                    {["Empresa", "CNPJ", "Status", "Verificação", "Cadastro"].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "10px 14px",
                          color: color.white3,
                          fontWeight: 600,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          fontSize: "9px",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, idx) => (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: `1px solid ${color.border}`,
                        background: idx % 2 === 0 ? "transparent" : color.bg2,
                      }}
                    >
                      <td style={{ padding: "12px 14px", color: color.white, fontWeight: 600 }}>
                        <div>{c.name}</div>
                        {c.email && (
                          <div style={{ fontSize: "9px", color: color.white3, marginTop: 2 }}>{c.email}</div>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", color: color.white2, letterSpacing: "0.05em" }}>
                        {formatCNPJ(c.cnpj)}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            border: `1px solid ${statusColor(c.status)}`,
                            color: statusColor(c.status),
                            fontSize: "9px",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                          }}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        {c.verified ? (
                          <span style={{ color: color.green }}>✓ Verificada</span>
                        ) : (
                          <span style={{ color: color.white3 }}>{c.verification_status ?? "—"}</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", color: color.white3 }}>
                        {c.created_at ? new Date(c.created_at).toLocaleDateString("pt-BR") : "—"}
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

export default CompaniesPage;
