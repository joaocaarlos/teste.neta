/**
 * UI Component: Badge
 */
import React from "react";

interface BadgeProps {
  label: string;
  color?: string;
  bg?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  color = "var(--amber)",
  bg = "var(--amber-dim)",
}) => (
  <span
    style={{
      fontFamily: "var(--mono)",
      fontSize: "10px",
      fontWeight: 500,
      letterSpacing: ".1em",
      textTransform: "uppercase",
      color: color,
      background: bg,
      border: `1px solid ${color}40`,
      padding: "3px 8px",
      display: "inline-block",
      whiteSpace: "nowrap",
    }}
  >
    {label}
  </span>
);

/**
 * UI Component: Button variants
 */
interface BtnProps {
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "danger" | "green" | "purple";
  onClick?: () => void;
  small?: boolean;
  full?: boolean;
  icon?: React.ComponentType<{ size?: number }>;
  disabled?: boolean;
}

export const Btn: React.FC<BtnProps> = ({
  children,
  variant = "primary",
  onClick,
  small,
  full,
  icon: Icon,
  disabled,
}) => {
  const base = {
    fontFamily: "var(--mono)",
    fontSize: small ? "10px" : "11px",
    fontWeight: 500,
    letterSpacing: ".1em",
    textTransform: "uppercase" as const,
    padding: small ? "7px 14px" : "11px 22px",
    border: "1px solid",
    cursor: disabled ? ("not-allowed" as const) : ("pointer" as const),
    transition: "all .2s",
    display: "inline-flex" as const,
    alignItems: "center",
    gap: 6,
    width: full ? "100%" : "auto",
    justifyContent: full ? "center" : ("flex-start" as const),
    opacity: disabled ? 0.5 : 1,
  };

  const styles: Record<string, React.CSSProperties> = {
    primary: {
      ...base,
      background: "var(--amber)",
      borderColor: "var(--amber)",
      color: "var(--bg)",
    },
    ghost: {
      ...base,
      background: "transparent",
      borderColor: "var(--border2)",
      color: "var(--white2)",
    },
    danger: {
      ...base,
      background: "transparent",
      borderColor: "rgba(239,68,68,.4)",
      color: "var(--red)",
    },
    green: {
      ...base,
      background: "rgba(34,197,94,.12)",
      borderColor: "rgba(34,197,94,.4)",
      color: "var(--green)",
    },
    purple: {
      ...base,
      background: "rgba(168,85,247,.12)",
      borderColor: "rgba(168,85,247,.4)",
      color: "var(--purple)",
    },
  };

  return (
    <button
      style={styles[variant] || styles.primary}
      onClick={!disabled ? onClick : undefined}
    >
      {Icon && <Icon size={13} />}
      {children}
    </button>
  );
};

/**
 * UI Component: Card container
 */
interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, style }) => (
  <div
    style={{
      background: "var(--bg2)",
      border: "1px solid var(--border)",
      ...style,
    }}
  >
    {children}
  </div>
);

/**
 * UI Component: Form field
 */
interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  hint?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  children,
  hint,
}) => (
  <div style={{ marginBottom: 16 }}>
    <label
      style={{
        fontFamily: "var(--mono)",
        fontSize: "10px",
        letterSpacing: ".12em",
        textTransform: "uppercase",
        color: "var(--white2)",
        display: "block",
        marginBottom: 6,
      }}
    >
      {label}
    </label>
    {children}
    {hint && (
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: "9px",
          color: "var(--white3)",
          marginTop: 4,
        }}
      >
        {hint}
      </div>
    )}
  </div>
);

/**
 * UI Component: Stat card
 */
interface StatProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ComponentType<{ size?: number; color?: string }>;
  color?: string;
}

export const Stat: React.FC<StatProps> = ({
  label,
  value,
  sub,
  icon: Icon,
  color = "var(--amber)",
}) => (
  <div
    style={{
      background: "var(--bg2)",
      border: "1px solid var(--border)",
      padding: "20px 24px",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 8,
      }}
    >
      <span
        style={{
          fontFamily: "var(--mono)",
          fontSize: "10px",
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color: "var(--white3)",
        }}
      >
        {label}
      </span>
      {Icon && <span style={{ opacity: 0.7, display: "inline-flex" }}><Icon size={16} color={color} /></span>}
    </div>
    <div
      style={{
        fontFamily: "var(--cond)",
        fontSize: "36px",
        fontWeight: 800,
        color: color,
        lineHeight: 1,
      }}
    >
      {value}
    </div>
    {sub && (
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: "10px",
          color: "var(--white3)",
          marginTop: 6,
        }}
      >
        {sub}
      </div>
    )}
  </div>
);

/**
 * UI Component: Section title
 */
interface SectionTitleProps {
  pre?: string;
  main: string;
  accent?: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
  pre,
  main,
  accent,
}) => (
  <div style={{ marginBottom: 36 }}>
    {pre && (
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: "10px",
          letterSpacing: ".2em",
          textTransform: "uppercase",
          color: "var(--amber)",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            width: 20,
            height: 1,
            background: "var(--amber)",
            display: "block",
          }}
        />
        {pre}
      </div>
    )}
    <h2
      style={{
        fontFamily: "var(--cond)",
        fontWeight: 900,
        fontSize: "clamp(28px,4vw,56px)",
        lineHeight: 0.95,
        textTransform: "uppercase",
        letterSpacing: "-.01em",
      }}
    >
      {main} {accent && <span style={{ color: "var(--amber)" }}>{accent}</span>}
    </h2>
  </div>
);
