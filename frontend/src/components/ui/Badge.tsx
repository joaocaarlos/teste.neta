import type { CSSProperties, ReactNode } from "react";

export type BadgeVariant =
  | "neutral"
  | "amber"
  | "green"
  | "red"
  | "blue"
  | "purple"
  | "orange";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  size?: "sm" | "md";
  style?: CSSProperties;
}

const VARIANTS: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  neutral: { bg: "var(--bg3)",           color: "var(--white2)", border: "var(--border)" },
  amber:   { bg: "var(--amber-dim)",     color: "var(--amber)",  border: "rgba(232,160,32,0.3)" },
  green:   { bg: "rgba(34,197,94,0.12)", color: "var(--green)",  border: "rgba(34,197,94,0.3)" },
  red:     { bg: "rgba(239,68,68,0.12)", color: "var(--red)",    border: "rgba(239,68,68,0.3)" },
  blue:    { bg: "rgba(59,130,246,0.12)",color: "var(--blue)",   border: "rgba(59,130,246,0.3)" },
  purple:  { bg: "rgba(168,85,247,0.12)",color: "var(--purple)", border: "rgba(168,85,247,0.3)" },
  orange:  { bg: "rgba(249,115,22,0.12)",color: "var(--orange)", border: "rgba(249,115,22,0.3)" },
};

/**
 * Badge padronizado para status, contadores, tags.
 *
 * @example
 * <Badge variant="green">Aprovado</Badge>
 * <Badge variant="red" size="sm">3 vencidos</Badge>
 */
export function Badge({ variant = "neutral", children, size = "md", style }: BadgeProps) {
  const v = VARIANTS[variant];
  const isSmall = size === "sm";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: isSmall ? "2px 8px" : "4px 10px",
        background: v.bg,
        color: v.color,
        border: `1px solid ${v.border}`,
        fontFamily: "var(--mono)",
        fontSize: isSmall ? 9 : 10,
        fontWeight: 500,
        textTransform: "uppercase",
        letterSpacing: ".1em",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/**
 * Mapa de status para variant. Centraliza a regra "status X = cor Y".
 */
export function statusVariant(status: string): BadgeVariant {
  const s = (status || "").toLowerCase();

  if (/aprovad|liberad|entreg|ativo|assinad|finaliz|resolvid/.test(s)) return "green";
  if (/reprovad|cancelad|recusad|estornad|suspens/.test(s)) return "red";
  if (/pendent|em.cota[çc][aã]o|em.análise/.test(s)) return "amber";
  if (/em.produ[çc][aã]o|em.negocia[çc][aã]o|retid/.test(s)) return "blue";
  if (/disputa|critic/.test(s)) return "orange";

  return "neutral";
}
