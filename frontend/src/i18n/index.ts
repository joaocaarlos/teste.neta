import { createContext, useContext, useState, useCallback, type ReactNode, createElement } from "react";

export type Locale = "pt-BR" | "en-US";

export interface Translations {
  // Auth
  "auth.login": string;
  "auth.register": string;
  "auth.logout": string;
  "auth.email": string;
  "auth.password": string;
  "auth.forgot_password": string;
  "auth.invalid_credentials": string;

  // Roles
  "role.demandante": string;
  "role.fornecedor": string;
  "role.admin": string;

  // Common
  "common.save": string;
  "common.cancel": string;
  "common.delete": string;
  "common.edit": string;
  "common.loading": string;
  "common.error": string;
  "common.success": string;
  "common.search": string;
  "common.filter": string;
  "common.back": string;
  "common.next": string;
  "common.confirm": string;
  "common.close": string;

  // Navigation
  "nav.dashboard": string;
  "nav.demands": string;
  "nav.proposals": string;
  "nav.orders": string;
  "nav.contracts": string;
  "nav.transactions": string;
  "nav.messages": string;
  "nav.notifications": string;
  "nav.calendar": string;
  "nav.settings": string;

  // Empty states
  "empty.demands.title": string;
  "empty.demands.message": string;
  "empty.proposals.title": string;
  "empty.proposals.message": string;
  "empty.orders.title": string;
  "empty.orders.message": string;
  "empty.notifications.title": string;
  "empty.notifications.message": string;

  // Dashboard
  "dashboard.new_demand": string;
  "dashboard.view_demands": string;
  "dashboard.admin_panel": string;
  "dashboard.greeting.morning": string;
  "dashboard.greeting.afternoon": string;
  "dashboard.greeting.evening": string;
  "dashboard.kpi.published_demands": string;
  "dashboard.kpi.received_proposals": string;
  "dashboard.kpi.active_orders": string;
  "dashboard.kpi.escrow_value": string;
  "dashboard.kpi.market_demands": string;
  "dashboard.kpi.sent_proposals": string;
  "dashboard.kpi.monthly_revenue": string;

  // Status
  "status.pending": string;
  "status.approved": string;
  "status.rejected": string;
  "status.delivered": string;
  "status.cancelled": string;

  // Errors
  "error.404": string;
  "error.500": string;
  "error.network": string;
  "error.session_expired": string;
}

const ptBR: Translations = {
  "auth.login": "Entrar",
  "auth.register": "Cadastrar",
  "auth.logout": "Sair",
  "auth.email": "E-mail",
  "auth.password": "Senha",
  "auth.forgot_password": "Esqueci minha senha",
  "auth.invalid_credentials": "E-mail, senha ou perfil incorretos.",

  "role.demandante": "Demandante",
  "role.fornecedor": "Fornecedor",
  "role.admin": "Administrador",

  "common.save": "Salvar",
  "common.cancel": "Cancelar",
  "common.delete": "Excluir",
  "common.edit": "Editar",
  "common.loading": "Carregando…",
  "common.error": "Erro",
  "common.success": "Sucesso",
  "common.search": "Buscar",
  "common.filter": "Filtrar",
  "common.back": "Voltar",
  "common.next": "Próximo",
  "common.confirm": "Confirmar",
  "common.close": "Fechar",

  "nav.dashboard": "Dashboard",
  "nav.demands": "Demandas",
  "nav.proposals": "Propostas",
  "nav.orders": "Pedidos",
  "nav.contracts": "Contratos",
  "nav.transactions": "Financeiro",
  "nav.messages": "Mensagens",
  "nav.notifications": "Notificações",
  "nav.calendar": "Calendário",
  "nav.settings": "Configurações",

  "empty.demands.title": "Nenhuma demanda ainda",
  "empty.demands.message": "Suas demandas publicadas aparecerão aqui.",
  "empty.proposals.title": "Nenhuma proposta",
  "empty.proposals.message": "Quando fornecedores enviarem propostas, elas aparecem aqui.",
  "empty.orders.title": "Nenhum pedido",
  "empty.orders.message": "Pedidos aparecem aqui quando uma proposta é aceita.",
  "empty.notifications.title": "Nenhuma notificação",
  "empty.notifications.message": "Você está em dia.",

  "dashboard.new_demand": "Nova Demanda",
  "dashboard.view_demands": "Ver Demandas",
  "dashboard.admin_panel": "Ir para painel Admin",
  "dashboard.greeting.morning": "Bom dia",
  "dashboard.greeting.afternoon": "Boa tarde",
  "dashboard.greeting.evening": "Boa noite",
  "dashboard.kpi.published_demands": "Demandas publicadas",
  "dashboard.kpi.received_proposals": "Propostas recebidas",
  "dashboard.kpi.active_orders": "Pedidos em andamento",
  "dashboard.kpi.escrow_value": "Valor em escrow",
  "dashboard.kpi.market_demands": "Demandas no mercado",
  "dashboard.kpi.sent_proposals": "Propostas enviadas",
  "dashboard.kpi.monthly_revenue": "Receita do mês",

  "status.pending": "Pendente",
  "status.approved": "Aprovado",
  "status.rejected": "Reprovado",
  "status.delivered": "Entregue",
  "status.cancelled": "Cancelado",

  "error.404": "Página não encontrada",
  "error.500": "Erro interno do servidor",
  "error.network": "Erro de conexão. Verifique sua internet.",
  "error.session_expired": "Sessão expirada. Faça login novamente.",
};

const enUS: Translations = {
  "auth.login": "Sign in",
  "auth.register": "Sign up",
  "auth.logout": "Sign out",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.forgot_password": "Forgot password",
  "auth.invalid_credentials": "Email, password or profile incorrect.",

  "role.demandante": "Buyer",
  "role.fornecedor": "Supplier",
  "role.admin": "Administrator",

  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.loading": "Loading…",
  "common.error": "Error",
  "common.success": "Success",
  "common.search": "Search",
  "common.filter": "Filter",
  "common.back": "Back",
  "common.next": "Next",
  "common.confirm": "Confirm",
  "common.close": "Close",

  "nav.dashboard": "Dashboard",
  "nav.demands": "Demands",
  "nav.proposals": "Proposals",
  "nav.orders": "Orders",
  "nav.contracts": "Contracts",
  "nav.transactions": "Payments",
  "nav.messages": "Messages",
  "nav.notifications": "Notifications",
  "nav.calendar": "Calendar",
  "nav.settings": "Settings",

  "empty.demands.title": "No demands yet",
  "empty.demands.message": "Your published demands will appear here.",
  "empty.proposals.title": "No proposals",
  "empty.proposals.message": "When suppliers send proposals, they appear here.",
  "empty.orders.title": "No orders",
  "empty.orders.message": "Orders appear here when a proposal is accepted.",
  "empty.notifications.title": "No notifications",
  "empty.notifications.message": "You're all caught up.",

  "dashboard.new_demand": "New Demand",
  "dashboard.view_demands": "View Demands",
  "dashboard.admin_panel": "Go to Admin Panel",
  "dashboard.greeting.morning": "Good morning",
  "dashboard.greeting.afternoon": "Good afternoon",
  "dashboard.greeting.evening": "Good evening",
  "dashboard.kpi.published_demands": "Published demands",
  "dashboard.kpi.received_proposals": "Received proposals",
  "dashboard.kpi.active_orders": "Active orders",
  "dashboard.kpi.escrow_value": "Escrow value",
  "dashboard.kpi.market_demands": "Market demands",
  "dashboard.kpi.sent_proposals": "Sent proposals",
  "dashboard.kpi.monthly_revenue": "Monthly revenue",

  "status.pending": "Pending",
  "status.approved": "Approved",
  "status.rejected": "Rejected",
  "status.delivered": "Delivered",
  "status.cancelled": "Cancelled",

  "error.404": "Page not found",
  "error.500": "Internal server error",
  "error.network": "Connection error. Check your internet.",
  "error.session_expired": "Session expired. Please sign in again.",
};

const translations: Record<Locale, Translations> = {
  "pt-BR": ptBR,
  "en-US": enUS,
};

const STORAGE_KEY = "cap4_locale";

function detectLocale(): Locale {
  if (typeof window === "undefined") return "pt-BR";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "pt-BR" || stored === "en-US") return stored;
  return navigator.language?.startsWith("en") ? "en-US" : "pt-BR";
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: keyof Translations) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key: keyof Translations) => translations[locale][key] || key,
    [locale]
  );

  return createElement(
    I18nContext.Provider,
    { value: { locale, setLocale, t } },
    children
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
