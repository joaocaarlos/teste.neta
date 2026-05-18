import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";

/**
 * Botão de alternância dark/light theme.
 * Inclui aria-label dinâmico para acessibilidade.
 */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      aria-label={`Alternar para tema ${isDark ? "claro" : "escuro"}`}
      title={isDark ? "Tema claro" : "Tema escuro"}
      style={{
        background: "transparent",
        border: "1px solid var(--border)",
        color: "var(--white)",
        padding: 8,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "border-color .2s, color .2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--amber)";
        e.currentTarget.style.color = "var(--amber)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.color = "var(--white)";
      }}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
