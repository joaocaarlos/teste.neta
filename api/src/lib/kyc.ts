export interface KYCResult {
  valid: boolean;
  source: "manual" | "receita_federal" | "stub";
  company_name?: string;
  status?: string;
  errors?: string[];
}

function isValidCNPJChecksum(cnpj: string): boolean {
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;
  const calc = (slice: string, weights: number[]): number => {
    const sum = slice.split("").reduce((acc, d, i) => acc + Number(d) * weights[i], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const d1 = calc(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(cnpj.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
}

async function fetchReceitaFederal(digits: string): Promise<Partial<KYCResult>> {
  const provider = (process.env.CNPJ_PROVIDER || "brasilapi").toLowerCase();
  const timeout = Number(process.env.CNPJ_PROVIDER_TIMEOUT_MS) || 4000;

  if (provider === "none") return { source: "stub" };

  const url = provider === "receitaws"
    ? `https://www.receitaws.com.br/v1/cnpj/${digits}`
    : `https://brasilapi.com.br/api/cnpj/v1/${digits}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "CapaCity-KYC/1.0", "Accept": "application/json" },
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    if (res.status === 404) return { valid: false, source: "receita_federal", errors: ["CNPJ não encontrado na Receita Federal."] };
    if (res.status === 429) return { source: "stub", errors: [] };
    if (!res.ok) return { source: "stub" };

    const data = await res.json() as Record<string, unknown>;
    const companyName = (data.nome || data.razao_social) as string | undefined;
    const situation = (data.situacao || data.descricao_situacao_cadastral) as string | undefined;

    if (data.status === "ERROR") {
      return { valid: false, source: "receita_federal", errors: [String(data.message || "Erro consultando Receita Federal.")] };
    }

    const validSituation = (situation || "").toUpperCase() === "ATIVA";
    return {
      valid: validSituation,
      source: "receita_federal",
      company_name: companyName,
      status: situation,
      errors: validSituation ? undefined : [`Empresa com situação cadastral "${situation || 'desconhecida'}" — não pode operar.`],
    };
  } catch {
    clearTimeout(timer);
    return { source: "stub" };
  }
}

export async function validateCNPJ(cnpj: string, opts?: { skipExternal?: boolean }): Promise<KYCResult> {
  const digits = (cnpj || "").replace(/\D/g, "");
  if (digits.length !== 14) return { valid: false, source: "stub", errors: ["CNPJ deve ter 14 dígitos."] };
  if (!isValidCNPJChecksum(digits)) return { valid: false, source: "stub", errors: ["CNPJ inválido (checksum)."] };
  if (opts?.skipExternal || process.env.NODE_ENV === "test") return { valid: true, source: "stub" };
  const external = await fetchReceitaFederal(digits);
  return {
    valid: external.valid ?? true,
    source: external.source ?? "stub",
    company_name: external.company_name,
    status: external.status,
    errors: external.errors,
  };
}

const DIACRITICS = /[̀-ͯ]/g;

export function generateSlug(name: string): string {
  return (name || "empresa")
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
    .slice(0, 80) || "empresa";
}
