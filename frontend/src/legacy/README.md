# Legacy — capacity_app.tsx monolítico

Esta pasta contém o **app original em arquivo único** (`LegacyApp.tsx`, ~4.2k linhas). Ele continua sendo a fonte canônica do dashboard e fluxo autenticado **enquanto extraímos peça por peça** para `frontend/src/features/`.

## Por que ainda existe?

- O monolito funciona 100% em produção
- Reescrever 4k linhas de uma vez = alto risco de regressão
- A arquitetura modular já está montada (ver `app/App.tsx`); o legacy é só o conteúdo

## Como o app/App.tsx usa o LegacyApp

```
app/App.tsx
├── /                       → LegacyApp (landing, login, dashboard)
├── /precos                 → PricingPage (módulo novo)
├── /como-funciona          → HowItWorksPage (módulo novo)
├── /privacidade            → PrivacyPage (módulo novo)
├── /termos                 → TermsPage (módulo novo)
├── /dashboard, /demandas…  → LegacyApp
└── (qualquer outra)        → NotFoundPage (módulo novo)
```

`App.tsx` envolve tudo em `<ErrorBoundary>`, `<I18nProvider>` e adiciona `<CookieBanner>`.

## Plano de extração (priorizado por uso)

| Sessão | Bloco a extrair          | De onde      | Para onde                              | Prioridade |
|--------|--------------------------|--------------|----------------------------------------|------------|
| 1      | `Landing`                | linha 1116   | `features/marketing/Landing.tsx`        | 🔴 ALTA   |
| 2      | `LoginPage` + `AuthFrame`| linha 1266   | `features/auth/LoginPage.tsx`           | 🔴 ALTA   |
| 3      | `ForgotPassword` + `Reset` + `Verify` | linha 1397 | `features/auth/Password*.tsx` | 🔴 ALTA |
| 4      | `RegisterPage`           | linha 1323   | substituir por `RegisterWizard` (já existe) | 🔴 ALTA |
| 5      | `AppShell` + sidebar     | linha 1514   | `features/dashboard/AppShell.tsx`       | 🟡 MÉDIA |
| 6      | `DashDemandante` `DashFornecedor` `DashAdmin` | 1635-1871 | `features/dashboard/Dash*.tsx` | 🟡 MÉDIA |
| 7      | `NovaDemanda` `ListaDemandas` `DetalhesDemanda` | 2057-4127 | `features/demands/*.tsx` (parcial) | 🟡 MÉDIA |
| 8      | `EnviarProposta` `CompararPropostas` | 2232-3848 | `features/proposals/*` (parcial) | 🟡 MÉDIA |
| 9      | `Pedidos`                | 2320         | `features/orders/`                      | 🟡 MÉDIA |
| 10     | `Chat`                   | 2636         | `features/messages/` (parcial)          | 🟢 BAIXA |
| 11     | `Financeiro`             | 2899         | `features/transactions/`                | 🟢 BAIXA |
| 12     | `Avaliacoes`             | 2971         | `features/reviews/`                     | 🟢 BAIXA |
| 13     | `Disputas`               | 3071         | `features/disputes/` (parcial)          | 🟢 BAIXA |
| 14     | `CadastroMaquinas`       | 2439         | `features/machines/`                    | 🟢 BAIXA |
| 15     | `CalendarioCapacidade`   | 2519         | `features/calendar/`                    | 🟢 BAIXA |
| 16     | `Qualidade`              | 2796         | `features/quality/`                     | 🟢 BAIXA |
| 17     | `VerificacaoEmpresarial` | 1872         | `features/verification/`                | 🟢 BAIXA |
| 18     | `AdminEmpresas` `LogsAuditoria` `VerificacaoAdmin` | 1999-3779 | `features/admin/*` | 🟢 BAIXA |
| 19     | `Configuracoes`          | 3215         | `features/settings/`                    | 🟢 BAIXA |
| 20     | `ContratosNDA` `ContratosRecorrentes` | 3551-3779 | `features/contracts/` (parcial) | 🟢 BAIXA |
| 21     | `BuscarFornecedores`     | 3970         | `features/search/`                      | 🟢 BAIXA |
| 22     | `FeedbackWidget`         | 3521         | `features/feedback/FeedbackWidget.tsx`  | 🟢 BAIXA |
| 23     | Todos os `*Modal`        | 689-1115     | `features/<dominio>/modals/`            | 🟢 BAIXA |
| 24     | `AuthProvider` `AppProvider` | 97-688   | `app/AuthContext.tsx` `app/AppContext.tsx` (já tem skeleton) | 🟡 MÉDIA |
| 25     | `MENUS` constants        | 1470         | `features/dashboard/menus.ts`           | 🟢 BAIXA |

## Como extrair uma seção sem quebrar

1. Identifique a função no LegacyApp (use linha do plano acima)
2. Crie o arquivo em `features/<domain>/<Nome>.tsx`
3. Cole o código, ajuste imports (`react`, `lucide-react`, hooks de `useAuth`, `useApp`)
4. **Exporte como nomeado**: `export function Nome(...)` (não default)
5. No `LegacyApp.tsx`, substitua a função inline por: `import { Nome } from "../features/...";`
6. Rode o build (`npm run build`) — TypeScript ajuda a achar quebrados
7. Teste no navegador a página afetada
8. Commit isolado por extração — facilita rollback

## Regras durante a transição

- ❌ Não adicionar **novas features** dentro de `LegacyApp.tsx`. Novo código vai direto em `features/`.
- ❌ Não corrigir bugs editando o legacy diretamente — extraia a seção primeiro, depois conserte.
- ✅ Bugs críticos podem ser corrigidos no legacy se a extração demorar — mas sempre com ticket de "extrair depois".
- ✅ Estilos (`CSS` constante no legacy) podem ser migrados para `styles/global.ts` em qualquer momento (sem dependências).
- ✅ Componentes utilitários (`Btn`, `Card`, `Stat`, `Badge`, `FormField`, etc.) já existem em `components/ui/` — usar esses, não os do legacy.

## Estado atual de extração

Já em `features/`:

- ✅ `auth/RegisterWizard.tsx` (substitui RegisterPage do legacy quando wireado)
- ✅ `contracts/` (Detail, List, useContracts) — paralela ao legacy
- ✅ `disputes/` (Detail, Form, List, useDisputes) — paralela ao legacy
- ✅ `error/ErrorBoundary` + `NotFoundPage`
- ✅ `marketing/` (Pricing, HowItWorks, Privacy, Terms) — **roteadas no app/App.tsx**
- ✅ `messages/` (ChatWindow, ConversationList, useMessages) — paralela
- ✅ `notifications/` (Bell, Panel, useNotifications) — paralela
- ✅ `proposals/` (Card, Form, List, useProposals) — paralela

"Paralela" = código novo coexiste com legacy; legacy ainda é o que roda na UI até o wire-up.

## Goal

**Esvaziar esta pasta**. Quando `LegacyApp.tsx` tiver < 200 linhas (só `App` + `AppRoot`), promover para `app/` e deletar a pasta `legacy/`.
