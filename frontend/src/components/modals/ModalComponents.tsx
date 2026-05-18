/**
 * Modal Components Library
 */
import React, { ReactNode } from "react";
import { X } from "lucide-react";
import { SCORE_CRITERIA } from "../../utils/constants";

/**
 * Base Modal container
 */
interface BaseModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}

export function BaseModal({
  open,
  onClose,
  title,
  children,
  width = 560,
}: BaseModalProps) {
  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-box" style={{ maxWidth: width }}>
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontFamily: "var(--cond)",
              fontSize: 18,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".04em",
            }}
          >
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--white3)",
              cursor: "pointer",
              display: "flex",
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: "24px" }}>{children}</div>
      </div>
    </div>
  );
}

/**
 * Score matching modal for supplier evaluation
 */
interface ScoreModalProps {
  supplier: {
    supplier: string;
    city: string;
    cert: string;
  } | null;
  open: boolean;
  onClose: () => void;
}

const SUPPLIER_SCORES: Record<string, number[]> = {
  "MetalPrime Usinagem": [25, 20, 13, 15, 9, 10, 4],
  "Indfab Nordeste": [25, 17, 14, 15, 8, 7, 5],
  "Precisão Tech SP": [22, 15, 8, 15, 10, 10, 5],
  "Usinagem Noroeste": [18, 14, 13, 0, 7, 10, 2],
};

export function ScoreModal({ supplier, open, onClose }: ScoreModalProps) {
  if (!supplier) return null;

  const pts =
    SUPPLIER_SCORES[supplier.supplier] || [20, 15, 10, 10, 8, 8, 4];
  const total = pts.reduce((a, b) => a + b, 0);

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={`Score de Matching · ${supplier.supplier}`}
      width={580}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: "var(--white3)",
              letterSpacing: ".08em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            {supplier.city} · {supplier.cert}
          </div>
          <div
            style={{
              fontFamily: "var(--body)",
              fontSize: 13,
              fontWeight: 300,
              color: "var(--white2)",
            }}
          >
            Baseado em 7 critérios ponderados para demanda DM-4821
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: "var(--cond)",
              fontSize: 64,
              fontWeight: 900,
              color: "var(--amber)",
              lineHeight: 1,
            }}
          >
            {total}
          </div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 9,
              color: "var(--white3)",
              letterSpacing: ".1em",
            }}
          >
            / 100 PONTOS
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {SCORE_CRITERIA.map((c, i) => {
          const pt = pts[i];
          const max = c.peso;
          const pct = Math.round((pt / max) * 100);

          return (
            <div key={c.label}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 5,
                }}
              >
                <div>
                  <span
                    style={{
                      fontFamily: "var(--cond)",
                      fontSize: 14,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: ".03em",
                    }}
                  >
                    {c.label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 9,
                      color: "var(--white3)",
                      marginLeft: 8,
                    }}
                  >
                    peso {c.peso}%
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span
                    style={{
                      fontFamily: "var(--cond)",
                      fontSize: 18,
                      fontWeight: 800,
                      color:
                        pct >= 80
                          ? "var(--green)"
                          : pct >= 50
                            ? "var(--amber)"
                            : "var(--red)",
                    }}
                  >
                    {pt}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 9,
                      color: "var(--white3)",
                    }}
                  >
                    /{max}
                  </span>
                </div>
              </div>
              <div className="score-bar">
                <div
                  className="score-fill"
                  style={{
                    width: `${pct}%`,
                    background:
                      pct >= 80
                        ? "var(--green)"
                        : pct >= 50
                          ? "var(--amber)"
                          : "var(--red)",
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 9,
                  color: "var(--white3)",
                  marginTop: 3,
                }}
              >
                {c.desc}
              </div>
            </div>
          );
        })}
      </div>
    </BaseModal>
  );
}

/**
 * Risk assessment modal
 */
interface RiskModalProps {
  proposal: {
    riskFactors: string[];
    risk: string;
  } | null;
  open: boolean;
  onClose: () => void;
}

export function RiskModal({ proposal, open, onClose }: RiskModalProps) {
  if (!proposal) return null;

  const riskColors: Record<string, string> = {
    baixo: "var(--green)",
    médio: "var(--amber)",
    alto: "var(--red)",
  };

  const riskBgs: Record<string, string> = {
    baixo: "rgba(34,197,94,.12)",
    médio: "rgba(249,115,22,.12)",
    alto: "rgba(239,68,68,.12)",
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title="Avaliação de Risco"
      width={520}
    >
      <div
        style={{
          padding: "20px",
          background: riskBgs[proposal.risk] || "var(--bg2)",
          border: `1px solid ${riskColors[proposal.risk] || "var(--border)"}`,
          borderRadius: 4,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            color: riskColors[proposal.risk],
            letterSpacing: ".1em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Nível de Risco
        </div>
        <div
          style={{
            fontFamily: "var(--cond)",
            fontSize: 28,
            fontWeight: 800,
            color: riskColors[proposal.risk],
            textTransform: "uppercase",
          }}
        >
          {proposal.risk}
        </div>
      </div>

      <div>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            color: "var(--white3)",
            letterSpacing: ".1em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Fatores Identificados
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(proposal.riskFactors || []).map((factor, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
                padding: "8px 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  background: riskColors[proposal.risk],
                  borderRadius: "50%",
                  marginTop: 5,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: "var(--body)",
                  fontSize: 13,
                  fontWeight: 300,
                  color: "var(--white2)",
                }}
              >
                {factor}
              </span>
            </div>
          ))}
        </div>
      </div>
    </BaseModal>
  );
}
