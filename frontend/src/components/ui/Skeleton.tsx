import type { CSSProperties } from "react";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  variant?: "text" | "rect" | "circle";
  style?: CSSProperties;
  count?: number;
}

/**
 * Skeleton — placeholder animado durante loading de dados.
 *
 * @example
 * <Skeleton width="100%" height={20} />
 * <Skeleton variant="circle" width={48} height={48} />
 * <Skeleton count={5} height={60} />
 */
export function Skeleton({
  width = "100%",
  height = 16,
  variant = "rect",
  style,
  count = 1,
}: SkeletonProps) {
  const baseStyle: CSSProperties = {
    width,
    height,
    background:
      "linear-gradient(90deg, var(--bg3) 0%, var(--bg4) 50%, var(--bg3) 100%)",
    backgroundSize: "200% 100%",
    animation: "skeleton-shimmer 1.4s ease-in-out infinite",
    borderRadius: variant === "circle" ? "50%" : variant === "text" ? 2 : 0,
    ...style,
  };

  if (count > 1) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            role="status"
            aria-label="Carregando"
            aria-busy="true"
            style={baseStyle}
          />
        ))}
      </div>
    );
  }

  return (
    <div role="status" aria-label="Carregando" aria-busy="true" style={baseStyle} />
  );
}

/**
 * SkeletonCard — card padrão com várias linhas de skeleton.
 */
export function SkeletonCard() {
  return (
    <div
      style={{
        padding: 20,
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <Skeleton variant="text" width="40%" height={18} />
      <Skeleton variant="text" width="80%" height={14} />
      <Skeleton variant="text" width="60%" height={14} />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <Skeleton width={80} height={28} />
        <Skeleton width={80} height={28} />
      </div>
    </div>
  );
}

/**
 * SkeletonRow — linha de tabela com colunas.
 */
export function SkeletonRow({ columns = 4 }: { columns?: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 16,
        padding: "12px 16px",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} variant="text" height={14} />
      ))}
    </div>
  );
}

// Adicionar ao global.ts:
// @keyframes skeleton-shimmer {
//   0% { background-position: 200% 0; }
//   100% { background-position: -200% 0; }
// }
