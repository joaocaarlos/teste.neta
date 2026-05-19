/**
 * AdminVerificationPage — admin queue for reviewing KYC submissions.
 * Inline styles only. TypeScript strict.
 */

import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiPatch } from "../../services/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type DocStatus = "pending" | "approved" | "rejected";
type ReviewAction = "approved" | "rejected";

interface PendingDoc {
  id: string;
  doc_type: string;
  filename: string;
  company_name: string;
  cnpj: string;
  uploaded_at: string;
  status: DocStatus;
}

interface RejectState {
  docId: string;
  note: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<string, string> = {
  cnpj_card: "Cartão CNPJ",
  social_contract: "Contrato Social",
  id_front: "RG / CNH (frente)",
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

function fmtDocType(type: string): string {
  return DOC_TYPE_LABELS[type] ?? type;
}

// ─── SkeletonRow ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[140, 120, 100, 90, 100].map((w, i) => (
        <td key={i} style={{ padding: "14px 16px" }}>
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
      <td style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <div
            style={{ height: 28, width: 70, background: "var(--bg3)", borderRadius: 2 }}
          />
          <div
            style={{ height: 28, width: 70, background: "var(--bg3)", borderRadius: 2 }}
          />
        </div>
      </td>
    </tr>
  );
}

// ─── DocRow ───────────────────────────────────────────────────────────────────

interface DocRowProps {
  doc: PendingDoc;
  rejectState: RejectState | null;
  acting: string | null;
  onApprove: (docId: string) => void;
  onStartReject: (docId: string) => void;
  onRejectNoteChange: (note: string) => void;
  onConfirmReject: (docId: string) => void;
  onCancelReject: () => void;
}

function DocRow({
  doc,
  rejectState,
  acting,
  onApprove,
  onStartReject,
  onRejectNoteChange,
  onConfirmReject,
  onCancelReject,
}: DocRowProps) {
  const isActing = acting === doc.id;
  const isRejecting = rejectState?.docId === doc.id;

  return (
    <>
      <tr
        style={{
          borderBottom: isRejecting ? "none" : "1px solid var(--border)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLTableRowElement).style.background = "var(--bg3)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
        }}
      >
        {/* Company name */}
        <td
          style={{
            padding: "14px 16px",
            fontFamily: "var(--body)",
            fontSize: 13,
            color: "var(--white)",
            fontWeight: 600,
          }}
        >
          {doc.company_name}
        </td>

        {/* CNPJ */}
        <td
          style={{
            padding: "14px 16px",
            fontFamily: "var(--mono)",
            fontSize: 10,
            color: "var(--white3)",
          }}
        >
          {doc.cnpj}
        </td>

        {/* Doc type */}
        <td
          style={{
            padding: "14px 16px",
            fontFamily: "var(--mono)",
            fontSize: 10,
            color: "var(--white2)",
            textTransform: "uppercase",
            letterSpacing: ".04em",
          }}
        >
          {fmtDocType(doc.doc_type)}
        </td>

        {/* Filename */}
        <td
          style={{
            padding: "14px 16px",
            fontFamily: "var(--body)",
            fontSize: 12,
            color: "var(--white3)",
            maxWidth: 200,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {doc.filename}
        </td>

        {/* Uploaded date */}
        <td
          style={{
            padding: "14px 16px",
            fontFamily: "var(--mono)",
            fontSize: 10,
            color: "var(--white3)",
            whiteSpace: "nowrap",
          }}
        >
          {fmtDate(doc.uploaded_at)}
        </td>

        {/* Actions */}
        <td style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {/* Aprovar */}
            <button
              type="button"
              disabled={isActing || isRejecting}
              onClick={() => onApprove(doc.id)}
              style={{
                padding: "6px 14px",
                background: "var(--green)18",
                border: "1px solid var(--green)44",
                color: "var(--green)",
                fontFamily: "var(--mono)",
                fontSize: 9,
                textTransform: "uppercase",
                letterSpacing: ".06em",
                cursor: isActing || isRejecting ? "not-allowed" : "pointer",
                opacity: isActing || isRejecting ? 0.5 : 1,
                transition: "opacity .15s",
              }}
            >
              {isActing ? "…" : "Aprovar"}
            </button>

            {/* Rejeitar */}
            <button
              type="button"
              disabled={isActing}
              onClick={() => onStartReject(doc.id)}
              style={{
                padding: "6px 14px",
                background: isRejecting ? "var(--red)44" : "var(--red)18",
                border: "1px solid var(--red)44",
                color: "var(--red)",
                fontFamily: "var(--mono)",
                fontSize: 9,
                textTransform: "uppercase",
                letterSpacing: ".06em",
                cursor: isActing ? "not-allowed" : "pointer",
                opacity: isActing ? 0.5 : 1,
                transition: "opacity .15s, background .15s",
              }}
            >
              Rejeitar
            </button>
          </div>
        </td>
      </tr>

      {/* ─── Inline reject form ─────────────────────────────────────────── */}
      {isRejecting && (
        <tr style={{ borderBottom: "1px solid var(--border)" }}>
          <td
            colSpan={6}
            style={{ padding: "0 16px 14px 16px", background: "var(--red)08" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                paddingTop: 10,
              }}
            >
              <input
                type="text"
                autoFocus
                placeholder="Motivo da rejeição (opcional)"
                value={rejectState?.note ?? ""}
                onChange={(e) => onRejectNoteChange(e.target.value)}
                style={{
                  flex: 1,
                  background: "var(--bg3)",
                  border: "1px solid var(--red)44",
                  color: "var(--white)",
                  fontFamily: "var(--body)",
                  fontSize: 12,
                  padding: "8px 12px",
                  outline: "none",
                  borderRadius: 0,
                }}
              />
              <button
                type="button"
                disabled={isActing}
                onClick={() => onConfirmReject(doc.id)}
                style={{
                  padding: "8px 16px",
                  background: "var(--red)",
                  border: "none",
                  color: "var(--bg)",
                  fontFamily: "var(--cond)",
                  fontWeight: 700,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  cursor: isActing ? "not-allowed" : "pointer",
                  opacity: isActing ? 0.6 : 1,
                  flexShrink: 0,
                }}
              >
                {isActing ? "…" : "Confirmar rejeição"}
              </button>
              <button
                type="button"
                onClick={onCancelReject}
                style={{
                  padding: "8px 12px",
                  background: "transparent",
                  border: "1px solid var(--border2)",
                  color: "var(--white3)",
                  fontFamily: "var(--mono)",
                  fontSize: 9,
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                Cancelar
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── AdminVerificationPage ────────────────────────────────────────────────────

export function AdminVerificationPage() {
  const [docs, setDocs] = useState<PendingDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [rejectState, setRejectState] = useState<RejectState | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    const res = await apiGet<PendingDoc[]>("/v1/verification/admin/queue");
    if (res.ok) {
      setDocs(res.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const handleAction = useCallback(
    async (docId: string, action: ReviewAction, reviewNote?: string) => {
      setActing(docId);
      try {
        const body: { status: ReviewAction; review_note?: string } = {
          status: action,
        };
        if (reviewNote && reviewNote.trim()) {
          body.review_note = reviewNote.trim();
        }
        await apiPatch(`/v1/verification/admin/${docId}`, body);
        setRejectState(null);
        await loadQueue();
      } catch {
        /* silent — list stays, user can retry */
      } finally {
        setActing(null);
      }
    },
    [loadQueue]
  );

  const handleApprove = useCallback(
    (docId: string) => handleAction(docId, "approved"),
    [handleAction]
  );

  const handleStartReject = useCallback((docId: string) => {
    setRejectState({ docId, note: "" });
  }, []);

  const handleRejectNoteChange = useCallback((note: string) => {
    setRejectState((prev) => (prev ? { ...prev, note } : null));
  }, []);

  const handleConfirmReject = useCallback(
    (docId: string) => {
      handleAction(docId, "rejected", rejectState?.note);
    },
    [handleAction, rejectState]
  );

  const handleCancelReject = useCallback(() => {
    setRejectState(null);
  }, []);

  return (
    <div
      style={{
        padding: "28px 32px",
        maxWidth: 1100,
        margin: "0 auto",
        fontFamily: "var(--body)",
      }}
    >
      {/* ─── Page header ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 28,
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
            Fila de Verificação
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
              : `${docs.length} documento${docs.length !== 1 ? "s" : ""} pendente${docs.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadQueue()}
          disabled={loading}
          style={{
            padding: "8px 16px",
            background: "transparent",
            border: "1px solid var(--border2)",
            color: loading ? "var(--white3)" : "var(--white2)",
            fontFamily: "var(--mono)",
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: ".06em",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? "Atualizando…" : "Atualizar"}
        </button>
      </div>

      {/* ─── Table ───────────────────────────────────────────────────────── */}
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
            minWidth: 700,
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--border)",
                background: "var(--bg3)",
              }}
            >
              {[
                "Empresa",
                "CNPJ",
                "Documento",
                "Arquivo",
                "Enviado em",
                "Ações",
              ].map((col) => (
                <th
                  key={col}
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontFamily: "var(--mono)",
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    color: "var(--white3)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

            {!loading && docs.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: "40px 16px",
                    textAlign: "center",
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    color: "var(--white3)",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                  }}
                >
                  Nenhum documento pendente de revisão
                </td>
              </tr>
            )}

            {!loading &&
              docs.map((doc) => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  rejectState={
                    rejectState?.docId === doc.id ? rejectState : null
                  }
                  acting={acting}
                  onApprove={handleApprove}
                  onStartReject={handleStartReject}
                  onRejectNoteChange={handleRejectNoteChange}
                  onConfirmReject={handleConfirmReject}
                  onCancelReject={handleCancelReject}
                />
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminVerificationPage;
