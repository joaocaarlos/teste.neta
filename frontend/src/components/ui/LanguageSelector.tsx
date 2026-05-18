import { useI18n, type Locale } from "../../i18n";

const FLAGS: Record<Locale, string> = {
  "pt-BR": "🇧🇷",
  "en-US": "🇺🇸",
};

const LABELS: Record<Locale, string> = {
  "pt-BR": "Português",
  "en-US": "English",
};

/**
 * Seletor de idioma com bandeiras.
 * Persiste a escolha em localStorage e atualiza o atributo lang do <html>.
 */
export function LanguageSelector() {
  const { locale, setLocale } = useI18n();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      aria-label="Selecionar idioma"
      style={{
        background: "transparent",
        color: "var(--white)",
        border: "1px solid var(--border)",
        padding: "8px 12px",
        fontFamily: "var(--mono)",
        fontSize: 11,
        cursor: "pointer",
        textTransform: "uppercase",
        letterSpacing: ".08em",
      }}
    >
      {(Object.keys(LABELS) as Locale[]).map((l) => (
        <option key={l} value={l}>
          {FLAGS[l]} {LABELS[l]}
        </option>
      ))}
    </select>
  );
}
