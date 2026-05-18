import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, XCircle, RefreshCw } from "lucide-react";

type ServiceStatus = "operational" | "degraded" | "outage";

interface ServiceCheck {
  status: ServiceStatus;
  latency_ms?: number;
  message?: string;
}

interface StatusResponse {
  status: ServiceStatus;
  ts: string;
  uptime_seconds: number;
  version: string;
  services: Record<string, ServiceCheck>;
}

const SERVICE_LABELS: Record<string, string> = {
  api: "API CapaCity",
  database: "Banco de Dados",
  cache: "Cache (Redis)",
  payments: "Pagamentos (Stripe)",
  errors: "Erros Críticos (24h)",
};

const STATUS_TEXT: Record<ServiceStatus, string> = {
  operational: "Operacional",
  degraded: "Degradado",
  outage: "Indisponível",
};

const STATUS_ICON = (s: ServiceStatus) => {
  if (s === "operational") return <CheckCircle size={20} style={{ color: "var(--green)" }} />;
  if (s === "degraded") return <AlertCircle size={20} style={{ color: "var(--orange)" }} />;
  return <XCircle size={20} style={{ color: "var(--red)" }} />;
};

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Status page pública — `/status`
 * Mostra estado dos serviços + uptime. Auto-refresh a cada 60s.
 */
export function StatusPage() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/status");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError("Não foi possível obter o status. A API pode estar fora do ar.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const t = setInterval(fetchStatus, 60_000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <RefreshCw size={32} style={{ animation: "spin 1s linear infinite", color: "var(--amber)" }} aria-hidden="true" />
      </main>
    );
  }

  const overall = data?.status || "outage";
  const bannerColor = overall === "operational" ? "var(--green)" : overall === "degraded" ? "var(--orange)" : "var(--red)";
  const bannerText =
    overall === "operational" ? "Todos os sistemas operacionais" :
    overall === "degraded" ? "Alguns sistemas degradados" :
    "Estamos com problemas";

  return (
    <main
      id="main-content"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "60px 24px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div
            style={{
              fontFamily: "var(--cond)",
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: ".06em",
              marginBottom: 8,
            }}
          >
            CAP<span style={{ color: "var(--amber)" }}>A</span>CITY
          </div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "var(--white3)",
              letterSpacing: ".15em",
              textTransform: "uppercase",
            }}
          >
            Status dos serviços
          </div>
        </div>

        {/* Banner status global */}
        <div
          role="status"
          aria-live="polite"
          style={{
            background: "var(--bg2)",
            border: `2px solid ${bannerColor}`,
            padding: 24,
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          {STATUS_ICON(overall)}
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "var(--cond)",
                fontSize: 22,
                fontWeight: 800,
                color: bannerColor,
                textTransform: "uppercase",
                letterSpacing: ".04em",
              }}
            >
              {bannerText}
            </div>
            {data && (
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--white3)", marginTop: 6 }}>
                Atualizado às {new Date(data.ts).toLocaleTimeString("pt-BR")} ·
                Uptime: {formatUptime(data.uptime_seconds)} ·
                Versão: {data.version}
              </div>
            )}
          </div>
          <button
            onClick={fetchStatus}
            aria-label="Atualizar status"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--white)",
              padding: 8,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={16} aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid var(--red)",
              color: "var(--red)",
              padding: 16,
              marginBottom: 24,
              fontFamily: "var(--body)",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {/* Lista de serviços */}
        {data && (
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}>
            {Object.entries(data.services).map(([key, check], i, arr) => (
              <div
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 20px",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                {STATUS_ICON(check.status)}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: "var(--cond)",
                      fontSize: 16,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: ".04em",
                    }}
                  >
                    {SERVICE_LABELS[key] || key}
                  </div>
                  {check.message && (
                    <div style={{ fontFamily: "var(--body)", fontSize: 12, color: "var(--white2)", marginTop: 4 }}>
                      {check.message}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 11,
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                      color:
                        check.status === "operational" ? "var(--green)" :
                        check.status === "degraded" ? "var(--orange)" :
                        "var(--red)",
                    }}
                  >
                    {STATUS_TEXT[check.status]}
                  </div>
                  {check.latency_ms != null && (
                    <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--white3)", marginTop: 2 }}>
                      {check.latency_ms}ms
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: 32,
            paddingTop: 24,
            borderTop: "1px solid var(--border)",
            fontFamily: "var(--mono)",
            fontSize: 10,
            color: "var(--white3)",
            letterSpacing: ".12em",
            textTransform: "uppercase",
            textAlign: "center",
          }}
        >
          Atualiza automaticamente a cada 60 segundos ·{" "}
          <a href="mailto:suporte@capacity.com.br" style={{ color: "var(--amber)" }}>
            suporte@capacity.com.br
          </a>
        </div>
      </div>
    </main>
  );
}
