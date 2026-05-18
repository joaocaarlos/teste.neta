interface SpinnerProps {
  size?: number;
  color?: string;
  label?: string;
}

/**
 * Spinner padronizado com label de acessibilidade.
 *
 * @example
 * <Spinner size={24} label="Carregando propostas..." />
 */
export function Spinner({ size = 24, color = "var(--amber)", label = "Carregando…" }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-live="polite"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ animation: "spin 1s linear infinite" }}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" stroke={color} strokeOpacity="0.2" strokeWidth="3" />
        <path
          d="M22 12c0-5.523-4.477-10-10-10"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <span
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * FullPageSpinner — centralizado em viewport.
 */
export function FullPageSpinner({ label = "Carregando…" }: { label?: string }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        zIndex: 999,
      }}
    >
      <Spinner size={48} label={label} />
      <div
        aria-hidden="true"
        style={{
          fontFamily: "var(--mono)",
          fontSize: 11,
          color: "var(--white3)",
          letterSpacing: ".15em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    </div>
  );
}

// CSS keyframe (já está no global.ts ou adicione):
// @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
