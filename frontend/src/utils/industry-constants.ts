/**
 * Constantes do domínio industrial — usar em selects, validators, autocomplete.
 * Mantido aqui para single source of truth (frontend + backend devem alinhar).
 */

// ───── Categorias de processo ─────────────────────────────────────────────
export const PROCESS_CATEGORIES = [
  { value: "usinagem",      label: "Usinagem",        sub: ["Torneamento CNC", "Fresamento CNC", "Furação", "Retífica", "Eletroerosão"] },
  { value: "estamparia",    label: "Estamparia",      sub: ["Corte", "Dobra", "Conformação", "Repuxo profundo"] },
  { value: "soldagem",      label: "Soldagem",        sub: ["MIG/MAG", "TIG", "Eletrodo revestido", "Arco submerso", "Solda a laser"] },
  { value: "fundicao",      label: "Fundição",        sub: ["Areia verde", "Cera perdida", "Sob pressão (alumínio)", "Centrífuga"] },
  { value: "injecao",       label: "Injeção plástica",sub: ["Termoplástico", "Termofixo", "Sopro", "Injeção a gás"] },
  { value: "tratamento",    label: "Tratamento térmico/superficial", sub: ["Têmpera", "Revenido", "Cementação", "Niquelação", "Cromagem", "Anodização", "Galvanização"] },
  { value: "caldeiraria",   label: "Caldeiraria",     sub: ["Tanques", "Estruturas metálicas", "Tubulação industrial", "Reservatórios"] },
  { value: "montagem",      label: "Montagem mecânica",sub: ["Montagem de subconjuntos", "Linha de produção", "Eletromecânica"] },
  { value: "ferramentaria",  label: "Ferramentaria",  sub: ["Moldes", "Matrizes", "Dispositivos", "Gabaritos"] },
  { value: "plastico",      label: "Plásticos",       sub: ["Extrusão", "Termoformagem", "Rotomoldagem"] },
  { value: "borracha",      label: "Borracha",        sub: ["Vulcanização", "Moldagem por compressão"] },
  { value: "textil",        label: "Têxtil",          sub: ["Tecelagem", "Confecção", "Bordado", "Estamparia têxtil"] },
  { value: "eletronica",    label: "Eletrônica",      sub: ["Montagem SMD", "Montagem PTH", "Cabeamento", "Testes"] },
  { value: "embalagem",     label: "Embalagem",       sub: ["Papel/papelão", "Plástica", "Madeira"] },
  { value: "outros",        label: "Outros",          sub: [] },
] as const;

export type ProcessCategory = typeof PROCESS_CATEGORIES[number]["value"];

// ───── Certificações industriais ──────────────────────────────────────────
export const CERTIFICATIONS = [
  { value: "iso_9001",    label: "ISO 9001",        sector: "Qualidade — geral" },
  { value: "iso_14001",   label: "ISO 14001",       sector: "Gestão ambiental" },
  { value: "iso_45001",   label: "ISO 45001",       sector: "Saúde e segurança" },
  { value: "iso_17025",   label: "ISO 17025",       sector: "Laboratórios" },
  { value: "iatf_16949",  label: "IATF 16949",      sector: "Automotivo" },
  { value: "as_9100",     label: "AS 9100",         sector: "Aeroespacial" },
  { value: "iso_13485",   label: "ISO 13485",       sector: "Dispositivos médicos" },
  { value: "fssc_22000",  label: "FSSC 22000",      sector: "Alimentos" },
  { value: "anvisa",      label: "ANVISA",          sector: "Saúde/cosméticos" },
  { value: "inmetro",     label: "INMETRO",         sector: "Metrologia geral" },
  { value: "abnt",        label: "ABNT NBR",        sector: "Normas brasileiras" },
  { value: "rohs",        label: "RoHS",            sector: "Eletrônicos UE" },
  { value: "ce_marking",  label: "CE Marking",      sector: "Mercado europeu" },
  { value: "ohsas_18001", label: "OHSAS 18001",     sector: "SST (legado)" },
] as const;

export type Certification = typeof CERTIFICATIONS[number]["value"];

// ───── Materiais comuns ───────────────────────────────────────────────────
export const MATERIALS = {
  acos: [
    "Aço SAE 1010", "Aço SAE 1020", "Aço SAE 1045", "Aço SAE 4140",
    "Aço inox 304", "Aço inox 316", "Aço inox 430",
    "Aço-carbono", "Aço-ferramenta P20", "Aço-ferramenta H13",
  ],
  aluminios: ["Alumínio 1050", "Alumínio 2024", "Alumínio 5052", "Alumínio 6061", "Alumínio 6063", "Alumínio 7075"],
  ferro: ["Ferro fundido cinzento GG-20", "Ferro fundido nodular FE-42012"],
  cobre: ["Cobre eletrolítico", "Latão CuZn37", "Bronze SAE-65"],
  plasticos: ["PP", "PE", "PEAD", "PEBD", "ABS", "PC (Policarbonato)", "PA6 (Nylon)", "PA66", "POM (Acetal)", "PMMA (Acrílico)", "PVC", "PET", "PEEK", "PTFE (Teflon)"],
  composites: ["Fibra de vidro + resina poliéster", "Fibra de carbono + epóxi", "Aramida (Kevlar)"],
  borrachas: ["NBR (Nitrílica)", "EPDM", "Silicone", "Neoprene", "Borracha natural"],
} as const;

// ───── Faixas de orçamento sugeridas ──────────────────────────────────────
export const BUDGET_RANGES = [
  { value: "ate_5k",        label: "Até R$ 5.000",          min: 0,       max: 5000     },
  { value: "5k_15k",        label: "R$ 5.000 – R$ 15.000",  min: 5000,    max: 15000    },
  { value: "15k_50k",       label: "R$ 15.000 – R$ 50.000", min: 15000,   max: 50000    },
  { value: "50k_150k",      label: "R$ 50.000 – R$ 150.000",min: 50000,   max: 150000   },
  { value: "150k_500k",     label: "R$ 150.000 – R$ 500.000",min: 150000, max: 500000   },
  { value: "500k_2m",       label: "R$ 500.000 – R$ 2 mi",  min: 500000,  max: 2000000  },
  { value: "acima_2m",      label: "Acima de R$ 2 mi",      min: 2000000, max: null     },
  { value: "a_negociar",    label: "A negociar",            min: null,    max: null     },
] as const;

// ───── Urgência ────────────────────────────────────────────────────────────
export const URGENCY_LEVELS = [
  { value: "Baixa",   label: "Baixa",   sla_hours: 72, color: "neutral", description: "Sem pressa específica" },
  { value: "Média",   label: "Média",   sla_hours: 48, color: "blue",    description: "Prazo padrão de mercado" },
  { value: "Alta",    label: "Alta",    sla_hours: 24, color: "amber",   description: "Precisamos rapidamente" },
  { value: "Crítica", label: "Crítica", sla_hours: 8,  color: "red",     description: "Linha parada, ASAP" },
] as const;

// ───── Estados brasileiros (sigla + nome + região) ────────────────────────
export const BR_STATES = [
  { uf: "AC", name: "Acre",                region: "Norte" },
  { uf: "AL", name: "Alagoas",             region: "Nordeste" },
  { uf: "AP", name: "Amapá",               region: "Norte" },
  { uf: "AM", name: "Amazonas",            region: "Norte" },
  { uf: "BA", name: "Bahia",               region: "Nordeste" },
  { uf: "CE", name: "Ceará",               region: "Nordeste" },
  { uf: "DF", name: "Distrito Federal",    region: "Centro-Oeste" },
  { uf: "ES", name: "Espírito Santo",      region: "Sudeste" },
  { uf: "GO", name: "Goiás",               region: "Centro-Oeste" },
  { uf: "MA", name: "Maranhão",            region: "Nordeste" },
  { uf: "MT", name: "Mato Grosso",         region: "Centro-Oeste" },
  { uf: "MS", name: "Mato Grosso do Sul",  region: "Centro-Oeste" },
  { uf: "MG", name: "Minas Gerais",        region: "Sudeste" },
  { uf: "PA", name: "Pará",                region: "Norte" },
  { uf: "PB", name: "Paraíba",             region: "Nordeste" },
  { uf: "PR", name: "Paraná",              region: "Sul" },
  { uf: "PE", name: "Pernambuco",          region: "Nordeste" },
  { uf: "PI", name: "Piauí",               region: "Nordeste" },
  { uf: "RJ", name: "Rio de Janeiro",      region: "Sudeste" },
  { uf: "RN", name: "Rio Grande do Norte", region: "Nordeste" },
  { uf: "RS", name: "Rio Grande do Sul",   region: "Sul" },
  { uf: "RO", name: "Rondônia",            region: "Norte" },
  { uf: "RR", name: "Roraima",             region: "Norte" },
  { uf: "SC", name: "Santa Catarina",      region: "Sul" },
  { uf: "SP", name: "São Paulo",           region: "Sudeste" },
  { uf: "SE", name: "Sergipe",             region: "Nordeste" },
  { uf: "TO", name: "Tocantins",           region: "Norte" },
] as const;

// ───── Validação CNPJ (frontend) ──────────────────────────────────────────
export function isValidCNPJ(cnpj: string): boolean {
  const c = (cnpj || "").replace(/\D/g, "");
  if (c.length !== 14) return false;
  if (/^(\d)\1+$/.test(c)) return false;

  const calc = (slice: string, weights: number[]) => {
    const sum = slice.split("").reduce((s, d, i) => s + Number(d) * weights[i], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const d1 = calc(c.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(c.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(c[12]) && d2 === Number(c[13]);
}

export function formatCNPJ(cnpj: string): string {
  const c = (cnpj || "").replace(/\D/g, "").slice(0, 14);
  return c
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function formatCEP(cep: string): string {
  return (cep || "").replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
}

export function formatPhone(phone: string): string {
  const p = (phone || "").replace(/\D/g, "").slice(0, 11);
  if (p.length <= 10) {
    return p.replace(/^(\d{2})(\d{4})(\d)/, "($1) $2-$3");
  }
  return p.replace(/^(\d{2})(\d{5})(\d)/, "($1) $2-$3");
}
