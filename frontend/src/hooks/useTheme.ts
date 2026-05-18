import { useEffect, useState, useCallback } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "cap4_theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  // Respeitar preferência do sistema
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/**
 * Hook para alternar tema dark/light.
 * Persiste a escolha em localStorage e aplica via data-theme no <html>.
 *
 * @example
 * const { theme, toggle } = useTheme();
 * <button onClick={toggle} aria-label={`Mudar para tema ${theme === 'dark' ? 'claro' : 'escuro'}`}>
 *   {theme === 'dark' ? <Sun /> : <Moon />}
 * </button>
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  // Sincroniza com mudanças no sistema
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: light)");
    if (!mq) return;

    const handler = (e: MediaQueryListEvent) => {
      // Só atualiza se o usuário não tiver feito escolha explícita
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) setTheme(e.matches ? "light" : "dark");
    };

    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  return { theme, setTheme, toggle };
}
