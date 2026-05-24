import { useEffect, useState } from "react";
import { analytics } from "../../services/analytics";

const STORAGE_KEY = "cap4_cookie_consent";
type Consent = "granted" | "denied" | null;

function getConsent(): Consent {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "granted" || v === "denied" ? v : null;
}

function setConsent(value: Exclude<Consent, null>): void {
  localStorage.setItem(STORAGE_KEY, value);
  analytics.reinit();
}

/**
 * Banner LGPD de consentimento de cookies.
 * Aparece até o usuário escolher; persiste em localStorage.
 *
 * Conformidade LGPD:
 * - Granularidade real (aceitar vs recusar, não só "OK")
 * - Default = denied (analytics não roda sem consentimento)
 * - Pode ser revogado depois via /privacidade
 */
export function CookieBanner({ privacyUrl = "/privacidade" }: { privacyUrl?: string }) {
  const [consent, setConsentState] = useState<Consent>(null);

  useEffect(() => {
    setConsentState(getConsent());
  }, []);

  if (consent !== null) return null;

  const handle = (value: "granted" | "denied") => {
    setConsent(value);
    setConsentState(value);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-title"
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        width: "min(480px, calc(100vw - 32px))",
        background: "var(--bg2)",
        border: "1px solid var(--border2)",
        padding: 20,
        zIndex: 9998,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      <div
        id="cookie-title"
        style={{
          fontFamily: "var(--cond)",
          fontSize: 14,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: ".06em",
        }}
      >
        Privacidade — Cookies
      </div>

      <p
        style={{
          fontFamily: "var(--body)",
          fontSize: 13,
          color: "var(--white2)",
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        Usamos cookies essenciais para autenticação e segurança. Cookies de
        análise nos ajudam a entender como o site é usado e melhorá-lo. Você
        pode aceitar todos ou recusar os analíticos a qualquer momento.{" "}
        <a
          href={privacyUrl}
          style={{ color: "var(--amber)", textDecoration: "underline" }}
        >
          Política de privacidade
        </a>
        .
      </p>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={() => handle("denied")}
          style={{
            padding: "10px 18px",
            background: "transparent",
            color: "var(--white)",
            border: "1px solid var(--border2)",
            fontFamily: "var(--cond)",
            fontWeight: 700,
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: ".08em",
            cursor: "pointer",
          }}
        >
          Apenas essenciais
        </button>
        <button
          onClick={() => handle("granted")}
          style={{
            padding: "10px 18px",
            background: "var(--amber)",
            color: "var(--bg)",
            border: "none",
            fontFamily: "var(--cond)",
            fontWeight: 700,
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: ".08em",
            cursor: "pointer",
          }}
        >
          Aceitar todos
        </button>
      </div>
    </div>
  );
}
