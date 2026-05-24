import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * ErrorBoundary captura erros não tratados na árvore React e exibe
 * uma tela amigável em vez de um app branco.
 *
 * @example
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Aqui dá pra enviar ao Sentry, requestId etc.
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <main
        role="alert"
        aria-live="assertive"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          background: "var(--bg)",
        }}
      >
        <div
          style={{
            maxWidth: 520,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.1)",
              color: "var(--red)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-hidden="true"
          >
            <AlertTriangle size={44} />
          </div>

          <div
            style={{
              fontFamily: "var(--cond)",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: ".04em",
              textTransform: "uppercase",
            }}
          >
            Algo deu errado
          </div>

          <div
            style={{
              fontFamily: "var(--body)",
              fontSize: 14,
              color: "var(--white2)",
              lineHeight: 1.6,
              maxWidth: 400,
            }}
          >
            Encontramos um problema inesperado. Tente recarregar a página.
            Se o erro persistir, contate o suporte.
          </div>

          {import.meta.env.DEV && (
            <details
              style={{
                marginTop: 8,
                fontFamily: "var(--mono)",
                fontSize: 11,
                color: "var(--white3)",
                textAlign: "left",
                maxWidth: 520,
                width: "100%",
              }}
            >
              <summary style={{ cursor: "pointer", marginBottom: 8 }}>
                Detalhes técnicos
              </summary>
              <pre
                style={{
                  background: "var(--bg2)",
                  border: "1px solid var(--border)",
                  padding: 12,
                  overflow: "auto",
                  maxHeight: 200,
                  whiteSpace: "pre-wrap",
                }}
              >
                {error.message}
                {"\n\n"}
                {error.stack}
              </pre>
            </details>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <button
              onClick={this.reset}
              style={{
                padding: "12px 22px",
                background: "transparent",
                color: "var(--white)",
                border: "1px solid var(--border2)",
                fontFamily: "var(--cond)",
                fontWeight: 700,
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: ".08em",
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              Tentar novamente
            </button>

            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "12px 22px",
                background: "var(--amber)",
                color: "var(--bg)",
                border: "none",
                fontFamily: "var(--cond)",
                fontWeight: 700,
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: ".08em",
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Recarregar
            </button>
          </div>
        </div>
      </main>
    );
  }
}
