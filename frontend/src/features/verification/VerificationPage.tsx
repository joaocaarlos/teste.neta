/**
 * VerificationPage — KYC document upload page for suppliers.
 * Inline styles only. TypeScript strict.
 */

import React, { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../services/api";
import { FileUpload } from "../uploads/FileUpload";
import type { UploadedFile } from "../uploads/FileUpload";

// ─── Types ────────────────────────────────────────────────────────────────────

type OverallStatus = "incomplete" | "pending" | "approved" | "rejected";
type DocStatus = "pending" | "approved" | "rejected" | "missing";
type DocType = "cnpj_card" | "social_contract" | "id_front";

interface VerificationDoc {
  id: string;
  doc_type: DocType;
  filename: string;
  status: DocStatus;
  review_note?: string | null;
}

interface VerificationStatus {
  overall: OverallStatus;
  docs: VerificationDoc[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REQUIRED_DOCS: { type: DocType; label: string; description: string }[] = [
  {
    type: "cnpj_card",
    label: "Cartão CNPJ",
    description: "Comprovante de inscrição no CNPJ (Receita Federal)",
  },
  {
    type: "social_contract",
    label: "Contrato Social",
    description: "Contrato social ou estatuto da empresa",
  },
  {
    type: "id_front",
    label: "RG / CNH (frente)",
    description: "Documento de identificação do responsável legal",
  },
];

const BANNER_CONFIG: Record<
  OverallStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  incomplete: {
    label: "Documentação incompleta — envie os documentos obrigatórios",
    color: "var(--amber)",
    bg: "var(--amber)18",
    border: "var(--amber)44",
  },
  pending: {
    label: "Documentação enviada — aguardando análise (até 2 dias úteis)",
    color: "var(--blue)",
    bg: "var(--blue)18",
    border: "var(--blue)44",
  },
  approved: {
    label: "Verificação aprovada — conta habilitada para operar",
    color: "var(--green)",
    bg: "var(--green)18",
    border: "var(--green)44",
  },
  rejected: {
    label: "Verificação rejeitada — revise e reenvie os documentos",
    color: "var(--red)",
    bg: "var(--red)18",
    border: "var(--red)44",
  },
};

const DOC_STATUS_COLORS: Record<DocStatus, string> = {
  pending: "var(--amber)",
  approved: "var(--green)",
  rejected: "var(--red)",
  missing: "var(--white3)",
};

const DOC_STATUS_LABELS: Record<DocStatus, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  missing: "Não enviado",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ─── StatusBanner ─────────────────────────────────────────────────────────────

function StatusBanner({ overall }: { overall: OverallStatus }) {
  const cfg = BANNER_CONFIG[overall];
  return (
    <div
      style={{
        padding: "14px 18px",
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        fontFamily: "var(--mono)",
        fontSize: 11,
        letterSpacing: ".04em",
        marginBottom: 28,
      }}
    >
      {cfg.label}
    </div>
  );
}

// ─── DocStatusBadge ───────────────────────────────────────────────────────────

function DocStatusBadge({ status }: { status: DocStatus }) {
  const color = DOC_STATUS_COLORS[status];
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
      {DOC_STATUS_LABELS[status]}
    </span>
  );
}

// ─── DocRow ───────────────────────────────────────────────────────────────────

interface DocRowProps {
  docDef: { type: DocType; label: string; description: string };
  existing: VerificationDoc | null;
  onUploadSuccess: (docType: DocType, file: UploadedFile) => void;
  onDelete: (docId: string) => void;
  deleting: string | null;
}

function DocRow({
  docDef,
  existing,
  onUploadSuccess,
  onDelete,
  deleting,
}: DocRowProps) {
  const [uploading, setUploading] = useState(false);

  const handleSuccess = useCallback(
    async (files: UploadedFile[]) => {
      const file = files[files.length - 1];
      if (!file) return;
      setUploading(true);
      try {
        await apiFetch("/v1/verification/upload", {
          method: "POST",
          body: JSON.stringify({ doc_type: docDef.type, file_id: file.id }),
          headers: { "Content-Type": "application/json" },
        });
        onUploadSuccess(docDef.type, file);
      } catch {
        /* silently fail — parent will reload on next fetch */
      } finally {
        setUploading(false);
      }
    },
    [docDef.type, onUploadSuccess]
  );

  const canUpload = !existing || existing.status === "rejected";
  const canDelete = !!existing && existing.status === "pending";
  const isDeletingThis = deleting === existing?.id;

  return (
    <div
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        padding: "20px 22px",
      }}
    >
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 12,
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--cond)",
              fontSize: 16,
              fontWeight: 700,
              textTransform: "uppercase",
              color: "var(--white)",
              marginBottom: 2,
            }}
          >
            {docDef.label}
          </div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: "var(--white3)",
            }}
          >
            {docDef.description}
          </div>
        </div>

        <DocStatusBadge status={existing?.status ?? "missing"} />
      </div>

      {/* ─── Existing file info ─────────────────────────────────────────── */}
      {existing && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            background: "var(--bg3)",
            border: "1px solid var(--border)",
            marginBottom: canUpload ? 14 : 0,
            gap: 12,
          }}
        >
          <span
            style={{
              fontFamily: "var(--body)",
              fontSize: 12,
              color: "var(--white2)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {existing.filename}
          </span>

          {existing.review_note && (
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 9,
                color: "var(--red)",
                flexShrink: 0,
                maxWidth: 180,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={existing.review_note}
            >
              {existing.review_note}
            </span>
          )}

          {canDelete && (
            <button
              type="button"
              disabled={isDeletingThis}
              onClick={() => onDelete(existing.id)}
              style={{
                padding: "4px 10px",
                background: "transparent",
                border: "1px solid var(--red)44",
                color: "var(--red)",
                fontFamily: "var(--mono)",
                fontSize: 9,
                textTransform: "uppercase",
                letterSpacing: ".06em",
                cursor: isDeletingThis ? "not-allowed" : "pointer",
                flexShrink: 0,
                opacity: isDeletingThis ? 0.5 : 1,
              }}
            >
              {isDeletingThis ? "Removendo…" : "Remover"}
            </button>
          )}
        </div>
      )}

      {/* ─── Upload area ────────────────────────────────────────────────── */}
      {canUpload && (
        <div style={{ opacity: uploading ? 0.6 : 1 }}>
          <FileUpload
            category="doc"
            accept=".pdf,.jpg,.jpeg,.png"
            maxFiles={1}
            label={existing ? "Enviar novo documento" : "Enviar documento"}
            disabled={uploading}
            onSuccess={handleSuccess}
          />
        </div>
      )}
    </div>
  );
}

// ─── VerificationPage ─────────────────────────────────────────────────────────

export function VerificationPage() {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/v1/verification/status");
      if (res.ok) {
        const data = (await res.json()) as VerificationStatus;
        setStatus(data);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleUploadSuccess = useCallback(
    (_docType: DocType, _file: UploadedFile) => {
      // Reload verification status after upload
      void loadStatus();
      setSubmitted(true);
    },
    [loadStatus]
  );

  const handleDelete = useCallback(
    async (docId: string) => {
      setDeleting(docId);
      try {
        const res = await apiFetch(`/v1/verification/${docId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          void loadStatus();
        }
      } catch {
        /* silent */
      } finally {
        setDeleting(null);
      }
    },
    [loadStatus]
  );

  // ─── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        style={{
          padding: "28px 32px",
          maxWidth: 800,
          margin: "0 auto",
          fontFamily: "var(--body)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: "var(--white3)",
          }}
        >
          Carregando…
        </div>
      </div>
    );
  }

  const docs = status?.docs ?? [];

  function getDocByType(type: DocType): VerificationDoc | null {
    return docs.find((d) => d.doc_type === type) ?? null;
  }

  return (
    <div
      style={{
        padding: "28px 32px",
        maxWidth: 800,
        margin: "0 auto",
        fontFamily: "var(--body)",
      }}
    >
      {/* ─── Page header ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
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
          Verificação de Conta
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--white3)",
            marginTop: 4,
            fontFamily: "var(--mono)",
          }}
        >
          Envie os documentos obrigatórios para habilitar sua conta
        </p>
      </div>

      {/* ─── Status banner ───────────────────────────────────────────────── */}
      {status && <StatusBanner overall={status.overall} />}

      {/* ─── Submission success message ──────────────────────────────────── */}
      {submitted && (
        <div
          style={{
            padding: "12px 16px",
            background: "var(--blue)18",
            border: "1px solid var(--blue)44",
            color: "var(--blue)",
            fontFamily: "var(--mono)",
            fontSize: 11,
            marginBottom: 20,
          }}
        >
          Documentos enviados. Aguarde análise em até 2 dias úteis.
        </div>
      )}

      {/* ─── Document list ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {REQUIRED_DOCS.map((docDef) => (
          <DocRow
            key={docDef.type}
            docDef={docDef}
            existing={getDocByType(docDef.type)}
            onUploadSuccess={handleUploadSuccess}
            onDelete={handleDelete}
            deleting={deleting}
          />
        ))}
      </div>
    </div>
  );
}

export default VerificationPage;
