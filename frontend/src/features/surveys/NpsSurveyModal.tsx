/**
 * NpsSurveyModal — Post-order NPS survey prompt.
 * Inline styles only. No Tailwind/CSS modules.
 */

import React, { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NpsSurvey {
  id: string;
  order_id?: string;
  order_title?: string;
  sent_at?: string;
  expires_at?: string;
}

interface NpsSurveyModalProps {
  survey: NpsSurvey;
  onClose: () => void;
  onSubmit: (score: number, comment: string) => Promise<void>;
}

// ─── Score button colors ───────────────────────────────────────────────────────

function getScoreColors(score: number, selected: boolean): React.CSSProperties {
  let bg: string;
  let border: string;
  let color: string;

  if (score <= 6) {
    bg = selected ? "#f87171" : "#fef2f2";
    border = "1px solid #f87171";
    color = selected ? "#fff" : "#b91c1c";
  } else if (score <= 8) {
    bg = selected ? "#facc15" : "#fefce8";
    border = "1px solid #facc15";
    color = selected ? "#78350f" : "#92400e";
  } else {
    bg = selected ? "#4ade80" : "#f0fdf4";
    border = "1px solid #4ade80";
    color = selected ? "#14532d" : "#166534";
  }

  return { background: bg, border, color };
}

// ─── NpsSurveyModal ───────────────────────────────────────────────────────────

export function NpsSurveyModal({ survey, onClose, onSubmit }: NpsSurveyModalProps) {
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Auto-close 2 seconds after success
  useEffect(() => {
    if (!submitted) return;
    const timer = setTimeout(() => {
      onClose();
    }, 2000);
    return () => clearTimeout(timer);
  }, [submitted, onClose]);

  const handleSubmit = async () => {
    if (selectedScore === null) return;
    setSubmitting(true);
    try {
      await onSubmit(selectedScore, comment);
      setSubmitted(true);
    } catch {
      // ignore — show success anyway for UX
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    /* Overlay */
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
    >
      {/* Card — stop click propagation */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg, #18181b)",
          border: "1px solid var(--border, #3f3f46)",
          borderRadius: 12,
          padding: 28,
          width: "100%",
          maxWidth: 480,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          boxShadow: "0 20px 60px rgba(0,0,0,.5)",
        }}
      >
        {submitted ? (
          /* ── Success state ── */
          <div
            style={{
              textAlign: "center",
              padding: "24px 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 48 }}>✅</div>
            <div
              style={{
                fontFamily: "var(--cond)",
                fontWeight: 700,
                fontSize: 18,
                textTransform: "uppercase",
                letterSpacing: ".04em",
                color: "var(--text, #fff)",
              }}
            >
              Obrigado pelo feedback! 🎉
            </div>
          </div>
        ) : (
          <>
            {/* ── Header ── */}
            <div>
              <div
                style={{
                  fontFamily: "var(--cond)",
                  fontWeight: 800,
                  fontSize: 19,
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                  color: "var(--text, #fff)",
                  marginBottom: 6,
                }}
              >
                Como foi sua experiência?
              </div>
              {survey.order_title && (
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    color: "var(--muted, #a1a1aa)",
                  }}
                >
                  {survey.order_title}
                </div>
              )}
            </div>

            {/* ── Score selector ── */}
            <div>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  justifyContent: "center",
                  marginBottom: 8,
                }}
              >
                {Array.from({ length: 11 }, (_, i) => i).map((score) => {
                  const isSelected = selectedScore === score;
                  const colors = getScoreColors(score, isSelected);
                  return (
                    <button
                      key={score}
                      onClick={() => setSelectedScore(score)}
                      style={{
                        width: 38,
                        height: 38,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        ...colors,
                        borderRadius: 6,
                        fontFamily: "var(--mono)",
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: "pointer",
                        transition: "all .12s",
                        flexShrink: 0,
                      }}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
              {/* Labels */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 4,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 9,
                    color: "var(--muted, #a1a1aa)",
                  }}
                >
                  Muito improvável
                </span>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 9,
                    color: "var(--muted, #a1a1aa)",
                  }}
                >
                  Muito provável
                </span>
              </div>
            </div>

            {/* ── Comment textarea ── */}
            <div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Quer comentar algo? (opcional)"
                rows={3}
                style={{
                  width: "100%",
                  background: "var(--bg, #18181b)",
                  border: "1px solid var(--border, #3f3f46)",
                  borderRadius: 6,
                  color: "var(--text, #fff)",
                  fontFamily: "var(--body)",
                  fontSize: 13,
                  padding: "10px 12px",
                  resize: "vertical",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>

            {/* ── Actions ── */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <button
                onClick={onClose}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--muted, #a1a1aa)",
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                Agora não
              </button>
              <button
                onClick={handleSubmit}
                disabled={selectedScore === null || submitting}
                style={{
                  padding: "10px 22px",
                  background:
                    selectedScore === null ? "var(--border, #3f3f46)" : "var(--amber, #e8a020)",
                  border: "none",
                  borderRadius: 6,
                  color:
                    selectedScore === null ? "var(--muted, #a1a1aa)" : "var(--bg, #18181b)",
                  fontFamily: "var(--cond)",
                  fontWeight: 700,
                  fontSize: 13,
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  cursor: selectedScore === null ? "not-allowed" : "pointer",
                  transition: "background .15s",
                }}
              >
                {submitting ? "Enviando…" : "Enviar resposta"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default NpsSurveyModal;
