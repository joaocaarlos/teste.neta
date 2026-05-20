/**
 * NDAPage — NDA management page
 * Route: /nda/*
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiFetch } from "../../services/api";
import { useAuth } from "../../app/AuthContext";
import { color, font, fontSize, space } from "../../styles/tokens";

// ─── Types ─────────────────────────────────────────────────────────────────────

type NDAStatus = "pending" | "signed" | "rejected" | string;

interface NDA {
  id: string;
  demand_title?: string;
  demand_id?: string;
  counterpart_company?: string;
  counterpart_name?: string;
  status: NDAStatus;
  signed_at?: string;
  created_at?: string;
  expires_at?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  pending:  "Pendente",
  signed:   "Assinado",
  rejected: "Rejeitado",
};

const STATUS_COLORS: Record<string, string> = {
  pending:  "var(--amber)",
  signed:   "var(--green)",
  rejected: "var(--red)",
};

function statusLabel(s: NDAStatus): string {
  return STATUS_LABELS[s] ?? s;
}

function statusColor(s: NDAStatus): string {
  return STATUS_COLORS[s] ?? color.white3;
}

// ─── Confirm dialog ─────────────────────────────────────────────────────────────

function ConfirmDialog({
  nda,
  onConfirm,
  onCancel,
  signing,
}: {
  nda: NDA;
  onConfirm: () => void;
  onCancel: () => void;
  signing: boolean;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: color.bg2,
          border: `1px solid ${color.border}`,
          padding: 32,
          maxWidth: 480,
          width: "90%",
        }}
      >
        <div style={{ fontFamily: font.mono, fontSize: fontSize.label, letterSpacing: "0.1em", textTransform: "uppercase", color: color.amber, marginBottom: 12 }}>
          Confirmar Assinatura
        </div>
        <p style={{ fontFamily: font.body, fontSize: fontSize.body, color: color.white, marginBottom: 8 }}>
          Você está prestes a assinar o NDA para:
        </p>
        <p style={{ fontFamily: font.mono, fontSize: fontSize.body, color: color.amber, fontWeight: 700, marginBottom: 4 }}>
          {nda.demand_title ?? `Demanda #${nda.demand_id}`}
        </p>
        {nda.counterpart_company && (
          <p style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: color.white2, marginBottom: 16 }}>
            Contraparte: {nda.counterpart_company}
          </p>
        )}
        <p style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: color.white3, marginBottom: 24 }}>
          Esta ação não pode ser desfeita.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onConfirm}
            disabled={signing}
            style={{
              flex: 1,
              padding: "10px 0",
              background: color.amber,
              border: "none",
              color: color.bg,
              fontFamily: font.mono,
              fontSize: fontSize.body,
              fontWeight: 700,
              cursor: signing ? "not-allowed" : "pointer",
              opacity: signing ? 0.6 : 1,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {signing ? "Assinando…" : "Confirmar Assinatura"}
          </button>
          <button
            onClick={onCancel}
            disabled={signing}
            style={{
              flex: 1,
              padding: "10px 0",
              background: "transparent",
              border: `1px solid ${color.border}`,
              color: color.white2,
              fontFamily: font.mono,
              fontSize: fontSize.body,
              cursor: signing ? "not-allowed" : "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function NDAPage() {
  const { user, authLoading } = useAuth();
  const navigate = useNavigate();

  const [ndas, setNdas] = useState<NDA[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmNda, setConfirmNda] = useState<NDA | null>(null);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await apiGet<NDA[] | { ndas: NDA[] }>("/v1/ndas");
    if (result.ok) {
      const raw = result.data;
      setNdas(Array.isArray(raw) ? raw : (raw.ndas ?? []));
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function handleSign(nda: NDA) {
    setSigning(true);
    setSignError(null);
    try {
      const res = await apiFetch(`/v1/ndas/${nda.id}/sign`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSignError(body.error ?? "Erro ao assinar NDA.");
      } else {
        setConfirmNda(null);
        await load();
      }
    } catch (e) {
      setSignError((e as Error).message ?? "Erro de conexão.");
    } finally {
      setSigning(false);
    }
  }

  if (authLoading || !user) return null;

  return (
    <div style={{ padding: `${space.xl}px ${space.lg}px` }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: space.xl }}>
        <div>
          <div style={{ fontFamily: font.mono, fontSize: fontSize.label, letterSpacing: "0.2em", textTransform: "uppercase", color: color.amber, marginBottom: 8 }}>
            Documentos
          </div>
          <h1 style={{ fontFamily: font.condensed, fontSize: fontSize.hero, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95, margin: 0 }}>
            Gestão de <span style={{ color: color.amber }}>NDAs</span>
          </h1>
        </div>
        <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: color.white3 }}>
          {ndas.length} NDA{ndas.length !== 1 ? "s" : ""}
        </div>
      </div>

      {signError && (
        <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: color.red, marginBottom: space.md, padding: "10px 14px", border: `1px solid ${color.red}` }}>
          {signError}
        </div>
      )}

      {loading && (
        <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: color.white3 }}>
          Carregando NDAs…
        </div>
      )}

      {error && (
        <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: color.red, marginBottom: space.md }}>
          Erro ao carregar NDAs: {error}
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
          {ndas.length === 0 ? (
            <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: color.white3, padding: space.xl, textAlign: "center", border: `1px dashed ${color.border}` }}>
              Nenhum NDA encontrado.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: font.mono, fontSize: fontSize.caption }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${color.border}` }}>
                    {["Demanda", "Contraparte", "Status", "Data de Assinatura", "Ações"].map((h) => (
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
                  {ndas.map((nda, idx) => (
                    <tr
                      key={nda.id}
                      style={{
                        borderBottom: `1px solid ${color.border}`,
                        background: idx % 2 === 0 ? "transparent" : color.bg2,
                      }}
                    >
                      <td style={{ padding: "12px 14px", color: color.white, fontWeight: 600 }}>
                        {nda.demand_title ?? `Demanda #${nda.demand_id ?? nda.id.slice(-6)}`}
                      </td>
                      <td style={{ padding: "12px 14px", color: color.white2 }}>
                        {nda.counterpart_company ?? nda.counterpart_name ?? "—"}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            border: `1px solid ${statusColor(nda.status)}`,
                            color: statusColor(nda.status),
                            fontSize: "9px",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                          }}
                        >
                          {statusLabel(nda.status)}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", color: color.white3 }}>
                        {nda.signed_at ? new Date(nda.signed_at).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        {nda.status === "pending" && (
                          <button
                            onClick={() => {
                              setSignError(null);
                              setConfirmNda(nda);
                            }}
                            style={{
                              padding: "6px 14px",
                              background: "transparent",
                              border: `1px solid ${color.amber}`,
                              color: color.amber,
                              fontFamily: font.mono,
                              fontSize: "9px",
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              cursor: "pointer",
                            }}
                          >
                            Assinar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {confirmNda && (
        <ConfirmDialog
          nda={confirmNda}
          onConfirm={() => void handleSign(confirmNda)}
          onCancel={() => setConfirmNda(null)}
          signing={signing}
        />
      )}
    </div>
  );
}

export default NDAPage;
