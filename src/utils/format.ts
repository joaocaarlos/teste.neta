/**
 * Helpers de formatação BR. Centralizar para consistência visual.
 */

/** R$ 1.234.567,89 */
export function formatCurrencyBRL(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (n == null || isNaN(n as number)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(n as number);
}

/** 1.234.567,89 */
export function formatNumber(value: number | string | null | undefined, fractionDigits = 2): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (n == null || isNaN(n as number)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n as number);
}

/** 11/05/2026 */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

/** 11/05/2026 às 14:30 */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(d);
  return `${date} às ${time}`;
}

/** "há 3 horas", "ontem", "há 2 dias" */
export function formatRelative(value: Date | string | null | undefined, now: Date = new Date()): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";

  const diffMs = now.getTime() - d.getTime();
  const sec = Math.round(diffMs / 1000);
  const min = Math.round(sec / 60);
  const hour = Math.round(min / 60);
  const day = Math.round(hour / 24);

  const fmt = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

  if (sec < 45) return "agora";
  if (min < 60) return fmt.format(-min, "minute");
  if (hour < 24) return fmt.format(-hour, "hour");
  if (day < 7) return fmt.format(-day, "day");
  if (day < 30) return fmt.format(-Math.round(day / 7), "week");
  if (day < 365) return fmt.format(-Math.round(day / 30), "month");
  return fmt.format(-Math.round(day / 365), "year");
}

/** "3.5 KB", "1.2 MB" */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || isNaN(bytes)) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Truncate longo: "Lorem ipsum dolor..." */
export function truncate(text: string | null | undefined, max = 60): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
}

/** Iniciais para avatar: "João Silva" → "JS" */
export function initials(name: string | null | undefined, max = 2): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, max)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Mask CNPJ para display público: ex. 12.345.xxx/xxxx-90 */
export function maskCNPJ(cnpj: string | null | undefined): string {
  if (!cnpj) return "—";
  const c = cnpj.replace(/\D/g, "");
  if (c.length !== 14) return cnpj;
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.***/****-${c.slice(12)}`;
}

/** % com 1 casa: "12.3%" */
export function formatPercent(value: number | null | undefined, fractionDigits = 1): string {
  if (value == null || isNaN(value)) return "—";
  return `${(value * 100).toFixed(fractionDigits).replace(".", ",")}%`;
}
