import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "../../utils/toast";
import { apiFetch } from "../../services/api";
import { analytics, Events } from "../../services/analytics";

type FeedbackType = "feedback" | "bug" | "feature";

/**
 * FeedbackWidget — botão flutuante no canto inferior direito.
 * Permite aos usuários enviar feedback rápido (bug, feature, comentário).
 * Envia para POST /feedback com pageUrl + userAgent + viewport.
 *
 * Versão modularizada de `LegacyApp.tsx` linhas 3521-3549.
 */
export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<FeedbackType>("feedback");
  const [submitting, setSubmitting] = useState(false);

  const send = async () => {
    if (!message.trim()) {
      toast.error("Descreva o feedback.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch("/feedback", {
        method: "POST",
        body: JSON.stringify({
          type,
          message,
          page: window.location.pathname,
          metadata: {
            userAgent: navigator.userAgent,
            viewport: [window.innerWidth, window.innerHeight],
          },
        }),
      });
      if (res.ok) {
        toast.success("Feedback enviado. Obrigado!");
        analytics.track(Events.FEEDBACK_SUBMITTED, { type });
        setMessage("");
        setOpen(false);
      } else {
        toast.error("Erro ao enviar feedback.");
      }
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 9998,
      }}
    >
      {open && (
        <div
          role="dialog"
          aria-labelledby="feedback-title"
          style={{
            width: 320,
            background: "var(--bg2)",
            border: "1px solid var(--border2)",
            padding: 14,
            boxShadow: "0 8px 30px rgba(0,0,0,.45)",
            marginBottom: 8,
          }}
        >
          <div
            id="feedback-title"
            style={{
              fontFamily: "var(--cond)",
              fontSize: 15,
              fontWeight: 700,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Feedback beta
          </div>

          <label
            htmlFor="feedback-type"
            style={{
              display: "block",
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: "var(--white3)",
              marginBottom: 4,
            }}
          >
            Tipo
          </label>
          <select
            id="feedback-type"
            value={type}
            onChange={(e) => setType(e.target.value as FeedbackType)}
            style={{ marginBottom: 8 }}
          >
            <option value="feedback">Comentário geral</option>
            <option value="bug">Bug / erro</option>
            <option value="feature">Ideia / sugestão</option>
          </select>

          <label
            htmlFor="feedback-msg"
            style={{
              display: "block",
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: "var(--white3)",
              marginBottom: 4,
            }}
          >
            Mensagem
          </label>
          <textarea
            id="feedback-msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="O que aconteceu? O que melhoraria sua experiência?"
            style={{ width: "100%", marginBottom: 10 }}
          />

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={() => setOpen(false)}
              disabled={submitting}
              style={btnGhost}
            >
              Cancelar
            </button>
            <button onClick={send} disabled={submitting} style={btnPrimary}>
              <Send size={12} aria-hidden="true" />
              {submitting ? "Enviando…" : "Enviar"}
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Fechar feedback" : "Abrir feedback"}
        style={{
          background: "var(--amber)",
          color: "var(--bg)",
          border: "none",
          padding: "10px 14px",
          fontFamily: "var(--mono)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          cursor: "pointer",
          boxShadow: "0 6px 20px rgba(0,0,0,.35)",
        }}
      >
        Feedback
      </button>
    </div>
  );
}

const btnGhost: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--border2)",
  color: "var(--white)",
  padding: "6px 12px",
  fontFamily: "var(--cond)",
  fontWeight: 700,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: ".06em",
  cursor: "pointer",
};

const btnPrimary: React.CSSProperties = {
  background: "var(--amber)",
  color: "var(--bg)",
  border: "none",
  padding: "6px 12px",
  fontFamily: "var(--cond)",
  fontWeight: 700,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: ".06em",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 4,
};
