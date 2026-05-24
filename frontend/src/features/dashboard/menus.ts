import {
  LayoutDashboard, Plus, ClipboardList, Factory, BarChart2,
  Package, Lock, Repeat, MessageCircle, CreditCard, Star,
  BadgeCheck, Settings, Cpu, Calendar, Inbox, FileCheck,
  UserCheck, DollarSign, AlertTriangle, ScrollText, Users, Shield, Bell,
  type LucideIcon,
} from "lucide-react";

export interface MenuItem {
  id: string;
  icon: LucideIcon | string;
  label: string;
  href?: string;
}

export type UserRole = "demandante" | "fornecedor" | "admin";

/**
 * Menus por perfil. Single source of truth — usar em Sidebar e ContentRouter.
 *
 * Versão modularizada de `LegacyApp.tsx` linhas 1470-1512.
 */
export const MENUS: Record<UserRole, MenuItem[]> = {
  demandante: [
    { id: "dashboard",             icon: LayoutDashboard, label: "Dashboard"          },
    { id: "nova-demanda",          icon: Plus,            label: "Nova Demanda"       },
    { id: "demandas",              icon: ClipboardList,   label: "Minhas Demandas"    },
    { id: "demandas/kanban",       icon: "⊞",             label: "Kanban",              href: "/demandas/kanban" },
    { id: "fornecedores",          icon: Factory,         label: "Fornecedores"       },
    { id: "comparar",              icon: BarChart2,       label: "Comparar Propostas" },
    { id: "pedidos",               icon: Package,         label: "Pedidos"            },
    { id: "nda",                   icon: Lock,            label: "NDA & Contratos"    },
    { id: "contratos-recorrentes", icon: Repeat,          label: "Contratos Recorr."  },
    { id: "chat",                  icon: MessageCircle,   label: "Chat"               },
    { id: "financeiro",            icon: CreditCard,      label: "Financeiro"         },
    { id: "avaliacoes",            icon: Star,            label: "Avaliações"         },
    { id: "verificacao",           icon: BadgeCheck,      label: "Verificação"        },
    { id: "empresa/membros",       icon: Users,           label: "Membros"            },
    { id: "empresa/cargos",        icon: Shield,          label: "Cargos"             },
    { id: "configuracoes/notificacoes", icon: Bell,       label: "Notificações",       href: "/configuracoes/notificacoes" },
    { id: "config",                icon: Settings,        label: "Configurações"      },
  ],

  fornecedor: [
    { id: "dashboard",             icon: LayoutDashboard, label: "Dashboard"         },
    { id: "maquinas",              icon: Cpu,             label: "Máquinas"          },
    { id: "calendario",            icon: Calendar,        label: "Calendário"        },
    { id: "demandas",              icon: Inbox,           label: "Oportunidades"     },
    { id: "pedidos",               icon: Package,         label: "Pedidos"           },
    { id: "nda",                   icon: Lock,            label: "NDA & Contratos"   },
    { id: "contratos-recorrentes", icon: Repeat,          label: "Contratos Recorr." },
    { id: "chat",                  icon: MessageCircle,   label: "Chat"              },
    { id: "qualidade",             icon: FileCheck,       label: "Qualidade"         },
    { id: "financeiro",            icon: CreditCard,      label: "Financeiro"        },
    { id: "avaliacoes",            icon: Star,            label: "Avaliações"        },
    { id: "verificacao",           icon: BadgeCheck,      label: "Verificação"       },
    { id: "empresa/membros",       icon: Users,           label: "Membros"            },
    { id: "empresa/cargos",        icon: Shield,          label: "Cargos"             },
    { id: "configuracoes/notificacoes", icon: Bell,       label: "Notificações",       href: "/configuracoes/notificacoes" },
    { id: "config",                icon: Settings,        label: "Configurações"     },
  ],

  admin: [
    { id: "dashboard",          icon: LayoutDashboard, label: "Dashboard Geral"   },
    { id: "empresas",           icon: Factory,         label: "Empresas"          },
    { id: "verificacao-admin",  icon: UserCheck,       label: "Verificações"      },
    { id: "demandas",           icon: ClipboardList,   label: "Demandas"          },
    { id: "pedidos",            icon: Package,         label: "Pedidos"           },
    { id: "financeiro",         icon: DollarSign,      label: "Transações"        },
    { id: "disputas",           icon: AlertTriangle,   label: "Disputas"          },
    { id: "auditoria",          icon: ScrollText,      label: "Logs de Auditoria" },
    { id: "config",             icon: Settings,        label: "Configurações"     },
  ],
};

/**
 * Helper: encontra o item de menu ativo dado uma página/rota.
 */
export function findMenuItem(role: UserRole, pageId: string): MenuItem | undefined {
  return MENUS[role]?.find((m) => m.id === pageId);
}
