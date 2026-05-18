/**
 * App.tsx — entrada modular da CapaCity.
 *
 * Compõe:
 *   - <ErrorBoundary>     captura erros não tratados
 *   - <I18nProvider>      idioma (PT-BR / EN-US)
 *   - <CookieBanner>      consentimento LGPD para visitantes
 *   - Marketing routes    /precos, /como-funciona, /privacidade, /termos
 *   - 404 page            qualquer rota desconhecida não autenticada
 *   - <LegacyApp>         o app completo (landing + auth + dashboard)
 *                         enquanto extraímos peça por peça para features/.
 */

import { Suspense, lazy, useEffect } from "react";
import { createBrowserRouter, RouterProvider, useNavigate } from "react-router-dom";
import { GLOBAL_CSS } from "../styles/global";
import { ErrorBoundary } from "../features/error/ErrorBoundary";
import { NotFoundPage } from "../features/error/NotFoundPage";
import { CookieBanner } from "../components/ui/CookieBanner";
import { I18nProvider } from "../i18n";
import { FullPageSpinner } from "../components/ui/Spinner";
import { analytics } from "../services/analytics";

// Lazy-load marketing pages (não precisam estar no bundle inicial)
const PricingPage     = lazy(() => import("../features/marketing/PricingPage").then(m => ({ default: m.PricingPage })));
const HowItWorksPage  = lazy(() => import("../features/marketing/HowItWorksPage").then(m => ({ default: m.HowItWorksPage })));
const PrivacyPage     = lazy(() => import("../features/marketing/PrivacyPage").then(m => ({ default: m.PrivacyPage })));
const TermsPage       = lazy(() => import("../features/marketing/TermsPage").then(m => ({ default: m.TermsPage })));
const StatusPage      = lazy(() => import("../features/status/StatusPage").then(m => ({ default: m.StatusPage })));

// Legacy app — todo o resto. Lazy para code-splitting.
const LegacyApp = lazy(() => import("../legacy/LegacyApp"));

// New modular feature pages
const MessagesPage  = lazy(() => import("../features/messages/MessagesPage").then(m => ({ default: m.MessagesPage })));
const MachinesPage  = lazy(() => import("../features/machines/MachinesPage").then(m => ({ default: m.MachinesPage })));
const CalendarPage  = lazy(() => import("../features/calendar/CalendarPage").then(m => ({ default: m.CalendarPage })));

// Injeta CSS global uma única vez
if (typeof document !== "undefined" && !document.getElementById("cap4-global-css")) {
  const style = document.createElement("style");
  style.id = "cap4-global-css";
  style.textContent = GLOBAL_CSS;
  document.head.appendChild(style);
}

// ───── Route wrappers com analytics ───────────────────────────────────────

function RouteWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    analytics.page(window.location.pathname);
  }, []);
  return <>{children}</>;
}

function PricingRoute() {
  const navigate = useNavigate();
  return (
    <RouteWrapper>
      <PricingPage onCTA={() => navigate("/")} />
    </RouteWrapper>
  );
}

function NotFoundRoute() {
  const navigate = useNavigate();
  return (
    <RouteWrapper>
      <NotFoundPage onHome={() => navigate("/")} onBack={() => window.history.back()} />
    </RouteWrapper>
  );
}

// ───── Router ──────────────────────────────────────────────────────────────

const router = createBrowserRouter([
  // Marketing
  { path: "/precos",        element: <PricingRoute /> },
  { path: "/pricing",       element: <PricingRoute /> },
  { path: "/como-funciona", element: <RouteWrapper><HowItWorksPage /></RouteWrapper> },
  { path: "/how-it-works",  element: <RouteWrapper><HowItWorksPage /></RouteWrapper> },
  { path: "/privacidade",   element: <RouteWrapper><PrivacyPage /></RouteWrapper> },
  { path: "/privacy",       element: <RouteWrapper><PrivacyPage /></RouteWrapper> },
  { path: "/termos",        element: <RouteWrapper><TermsPage /></RouteWrapper> },
  { path: "/terms",         element: <RouteWrapper><TermsPage /></RouteWrapper> },
  { path: "/status",        element: <RouteWrapper><StatusPage /></RouteWrapper> },

  // Legacy app handles all authenticated + auth routes
  { path: "/",                      element: <LegacyApp /> },
  { path: "/login",                 element: <LegacyApp /> },
  { path: "/cadastro",              element: <LegacyApp /> },
  { path: "/register",              element: <LegacyApp /> },
  { path: "/forgot",                element: <LegacyApp /> },
  { path: "/forgot-password",       element: <LegacyApp /> },
  { path: "/reset-password",        element: <LegacyApp /> },
  { path: "/verify-email",          element: <LegacyApp /> },
  { path: "/auth/forgot-password",  element: <LegacyApp /> },
  { path: "/auth/reset-password",   element: <LegacyApp /> },
  { path: "/auth/verify-email",     element: <LegacyApp /> },
  { path: "/dashboard/*",           element: <LegacyApp /> },
  { path: "/demandas/*",            element: <LegacyApp /> },
  { path: "/propostas/*",           element: <LegacyApp /> },
  { path: "/pedidos/*",             element: <LegacyApp /> },
  { path: "/contratos/*",           element: <LegacyApp /> },
  { path: "/maquinas/*",            element: <RouteWrapper><MachinesPage /></RouteWrapper> },
  { path: "/calendario/*",          element: <RouteWrapper><CalendarPage /></RouteWrapper> },
  { path: "/chat/*",                element: <RouteWrapper><MessagesPage /></RouteWrapper> },
  { path: "/financeiro/*",          element: <LegacyApp /> },
  { path: "/disputas/*",            element: <LegacyApp /> },
  { path: "/avaliacoes/*",          element: <LegacyApp /> },
  { path: "/qualidade/*",           element: <LegacyApp /> },
  { path: "/verificacao/*",         element: <LegacyApp /> },
  { path: "/verificacao-admin/*",   element: <LegacyApp /> },
  { path: "/empresas/*",            element: <LegacyApp /> },
  { path: "/auditoria/*",           element: <LegacyApp /> },
  { path: "/config/*",              element: <LegacyApp /> },
  { path: "/configuracoes/*",       element: <LegacyApp /> },
  { path: "/admin/*",               element: <LegacyApp /> },
  { path: "/contratos-recorrentes/*", element: <LegacyApp /> },
  { path: "/nda/*",                 element: <LegacyApp /> },
  { path: "/comparar/*",            element: <LegacyApp /> },
  { path: "/fornecedores/*",        element: <LegacyApp /> },
  { path: "/nova-demanda/*",        element: <LegacyApp /> },
  { path: "/acompanhamento/*",      element: <LegacyApp /> },

  // 404 fallback
  { path: "*", element: <NotFoundRoute /> },
]);

// ───── Root component ──────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <Suspense fallback={<FullPageSpinner label="Carregando…" />}>
          <RouterProvider router={router} />
        </Suspense>
        <CookieBanner privacyUrl="/privacidade" />
      </I18nProvider>
    </ErrorBoundary>
  );
}
