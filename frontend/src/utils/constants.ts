/**
 * Global constants and theme definitions
 */

export const COLORS = {
  bg: "#070708",
  bg2: "#0f0f11",
  bg3: "#161618",
  bg4: "#1e1e21",
  border: "rgba(255,255,255,0.07)",
  border2: "rgba(255,255,255,0.12)",
  amber: "#E8A020",
  amber2: "#F5B942",
  amberDim: "rgba(232,160,32,0.1)",
  amberDim2: "rgba(232,160,32,0.18)",
  green: "#22C55E",
  red: "#EF4444",
  blue: "#3B82F6",
  purple: "#A855F7",
  orange: "#F97316",
  white: "#F2EDE4",
  white2: "#B9AEA0",
  white3: "#A89F93",
};

export const STATUS_COLORS: Record<string, string> = {
  Publicado: "#3B82F6",
  "Em cotação": "var(--amber)",
  "Em negociação": "var(--purple)",
  Contratado: "var(--green)",
  "Em produção": "#22D3EE",
  "Em inspeção": "var(--orange)",
  "Aguardando coleta": "#E879F9",
  "Em transporte": "#60A5FA",
  Entregue: "var(--green)",
  Finalizado: "var(--white3)",
  Cancelado: "var(--red)",
  "Em disputa": "var(--red)",
  Ativo: "var(--green)",
  Pausado: "var(--orange)",
  Assinado: "var(--green)",
  "Aguardando assinatura": "var(--amber)",
  Aprovado: "var(--green)",
  "Em análise": "var(--amber)",
  Pendente: "var(--orange)",
  Reprovado: "var(--red)",
};

export const URG_COLORS: Record<string, string> = {
  Baixa: "var(--white3)",
  Média: "#3B82F6",
  Alta: "var(--amber)",
  Crítica: "var(--red)",
};

export const RISK_COLORS: Record<string, string> = {
  Baixo: "var(--green)",
  Médio: "var(--orange)",
  Alto: "var(--red)",
  Crítico: "var(--red)",
};

export const RISK_BG: Record<string, string> = {
  Baixo: "rgba(34,197,94,.08)",
  Médio: "rgba(249,115,22,.08)",
  Alto: "rgba(239,68,68,.08)",
  Crítico: "rgba(239,68,68,.14)",
};

export const LOG_COLORS: Record<string, string> = {
  auth: "var(--blue)",
  proposta: "var(--amber)",
  nda: "var(--purple)",
  contrato: "var(--green)",
  demanda: "#22D3EE",
  producao: "var(--orange)",
  disputa: "var(--red)",
  arquivo: "var(--white2)",
  auth_fail: "var(--red)",
};

export const ORDER_STATUS_STEPS = [
  "Publicado",
  "Em cotação",
  "Contratado",
  "Em setup",
  "Em produção",
  "Em inspeção",
  "Aguardando coleta",
  "Em transporte",
  "Entregue",
  "Finalizado",
];

export const SCORE_CRITERIA = [
  {
    label: "Processo compatível",
    peso: 25,
    desc: "Máquinas e processo exatamente compatíveis com o requerido",
  },
  {
    label: "Capacidade disponível",
    peso: 20,
    desc: "Horas-máquina livres suficientes para o volume da demanda",
  },
  {
    label: "Localização logística",
    peso: 15,
    desc: "Proximidade ao destino de entrega e custo de frete",
  },
  {
    label: "Certificação",
    peso: 15,
    desc: "ISO 9001, IATF, Anvisa ou outras certificações exigidas",
  },
  {
    label: "Avaliação histórica",
    peso: 10,
    desc: "Nota média e taxa de entrega no prazo dos últimos pedidos",
  },
  {
    label: "Prazo",
    peso: 10,
    desc: "Disponibilidade de calendário compatível com o deadline",
  },
  {
    label: "Preço médio",
    peso: 5,
    desc: "Aderência ao orçamento estimado da demanda",
  },
];

export const INDUSTRIES = [
  { icon: "⚙️", title: "Usinagem CNC", desc: "Torneamento, fresamento, furação..." },
  {
    icon: "👉",
    title: "Injeção Plástica",
    desc: "Moldagem por injeção, extrusão...",
  },
  {
    icon: "👕",
    title: "Confecção Têxtil",
    desc: "Corte e costura, bordado, estamparia...",
  },
  {
    icon: "📥",
    title: "Caldeiraria",
    desc: "Vasos de pressão, trocadores de calor...",
  },
  {
    icon: "⚡",
    title: "Montagem Eletrônica",
    desc: "PCB, SMD, solda seletiva...",
  },
  {
    icon: "🌡️",
    title: "Tratamento Térmico",
    desc: "Têmpera, revenimento, cementação...",
  },
  {
    icon: "🗿",
    title: "Fundição",
    desc: "Fundição em areia, cera perdida...",
  },
  {
    icon: "🖨️",
    title: "Impressão 3D",
    desc: "FDM, SLA, SLS e DMLS...",
  },
];

export const DEMO_USERS = {
  demandante: {
    email: "joao@metalparts.com.br",
    password: "demo123",
  },
  fornecedor: {
    email: "pedro@metalprime.com.br",
    password: "demo123",
  },
  admin: {
    email: "admin@capacity.com.br",
    password: "admin123",
  },
};
