/**
 * App.tsx — entrada modular da CapaCity.
 *
 * Compõe:
 *   - <ErrorBoundary>     captura erros não tratados
 *   - <I18nProvider>      idioma (PT-BR / EN-US)
 *   - <CookieBanner>      consentimento LGPD para visitantes
 *   - Marketing routes    /precos, /como-funciona, /privacidade, /termos
 *   - 404 page            qualquer rota desconhecida não autenticada
 */

import { Suspense, lazy, useEffect } from "react";
import { createBrowserRouter, RouterProvider, useNavigate } from "react-router-dom";
import { GLOBAL_CSS } from "../styles/global";
import { ErrorBoundary } from "../features/error/ErrorBoundary";
import { NotFoundPage } from "../features/error/NotFoundPage";
import { CookieBanner } from "../components/ui/CookieBanner";
import { ToastContainer } from "../components/layout/ToastContainer";
import { I18nProvider } from "../i18n";
import { FullPageSpinner } from "../components/ui/Spinner";
import { analytics } from "../services/analytics";

// Lazy-load marketing pages (não precisam estar no bundle inicial)
const PricingPage     = lazy(() => import("../features/marketing/PricingPage").then(m => ({ default: m.PricingPage })));
const HowItWorksPage  = lazy(() => import("../features/marketing/HowItWorksPage").then(m => ({ default: m.HowItWorksPage })));
const PrivacyPage     = lazy(() => import("../features/marketing/PrivacyPage").then(m => ({ default: m.PrivacyPage })));
const TermsPage       = lazy(() => import("../features/marketing/TermsPage").then(m => ({ default: m.TermsPage })));
const StatusPage      = lazy(() => import("../features/status/StatusPage").then(m => ({ default: m.StatusPage })));

// Extracted landing / reviews / order-tracking pages
const LandingPage         = lazy(() => import("../features/landing/LandingPage").then(m => ({ default: m.LandingPage })));
const ReviewsPage         = lazy(() => import("../features/reviews/ReviewsPage").then(m => ({ default: m.ReviewsPage })));
const OrderTrackingPage   = lazy(() => import("../features/tracking/OrderTrackingPage").then(m => ({ default: m.OrderTrackingPage })));

// New modular feature pages
const MessagesPage        = lazy(() => import("../features/messages/MessagesPage").then(m => ({ default: m.MessagesPage })));
const MachinesPage        = lazy(() => import("../features/machines/MachinesPage").then(m => ({ default: m.MachinesPage })));
const CalendarPage        = lazy(() => import("../features/calendar/CalendarPage").then(m => ({ default: m.CalendarPage })));
const DisputeList         = lazy(() => import("../features/disputes/DisputeList"));
const ExecutiveDashboard  = lazy(() => import("../features/admin/ExecutiveDashboard").then(m => ({ default: m.ExecutiveDashboard })));
const DashboardPage       = lazy(() => import("../features/dashboard/DashboardPage").then(m => ({ default: m.DashboardPage })));
const DemandsPage         = lazy(() => import("../features/demands/DemandsPage").then(m => ({ default: m.DemandsPage })));
const ProposalList        = lazy(() => import("../features/proposals/ProposalList"));
const ContractList        = lazy(() => import("../features/contracts/ContractList"));
const DemandWizard        = lazy(() => import("../features/demands/DemandWizard").then(m => ({ default: m.DemandWizard })));
const OrdersPage          = lazy(() => import("../features/orders/OrdersPage").then(m => ({ default: m.OrdersPage })));
const FinancialPage       = lazy(() => import("../features/financial/FinancialPage").then(m => ({ default: m.FinancialPage })));
const SuppliersPage       = lazy(() => import("../features/suppliers/SuppliersPage").then(m => ({ default: m.SuppliersPage })));
const LoginPage           = lazy(() => import("../features/auth/LoginPage").then(m => ({ default: m.LoginPage })));
const RegisterPage        = lazy(() => import("../features/auth/RegisterPage").then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage  = lazy(() => import("../features/auth/ForgotPasswordPage").then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage   = lazy(() => import("../features/auth/ResetPasswordPage").then(m => ({ default: m.ResetPasswordPage })));
const VerifyEmailPage     = lazy(() => import("../features/auth/VerifyEmailPage").then(m => ({ default: m.VerifyEmailPage })));
const SettingsPage        = lazy(() => import("../features/settings/SettingsPage").then(m => ({ default: m.SettingsPage })));
const VerificationPage    = lazy(() => import("../features/verification/VerificationPage").then(m => ({ default: m.VerificationPage })));
const AdminVerificationPage = lazy(() => import("../features/verification/AdminVerificationPage").then(m => ({ default: m.AdminVerificationPage })));
const QualityPage         = lazy(() => import("../features/quality/QualityPage").then(m => ({ default: m.QualityPage })));
const CompaniesPage       = lazy(() => import("../features/companies/CompaniesPage").then(m => ({ default: m.CompaniesPage })));
const AuditPage           = lazy(() => import("../features/audit/AuditPage").then(m => ({ default: m.AuditPage })));
const ProposalComparePage = lazy(() => import("../features/proposals/ProposalComparePage").then(m => ({ default: m.ProposalComparePage })));
const NDAPage             = lazy(() => import("../features/ndas/NDAPage").then(m => ({ default: m.NDAPage })));
const RecurringContractsPage = lazy(() => import("../features/recurring/RecurringContractsPage").then(m => ({ default: m.RecurringContractsPage })));

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

  // Landing + extracted feature routes
  { path: "/",                      element: <RouteWrapper><LandingPage /></RouteWrapper> },
  { path: "/login",                 element: <RouteWrapper><LoginPage /></RouteWrapper> },
  { path: "/cadastro",              element: <RouteWrapper><RegisterPage /></RouteWrapper> },
  { path: "/register",              element: <RouteWrapper><RegisterPage /></RouteWrapper> },
  { path: "/forgot",                element: <RouteWrapper><ForgotPasswordPage /></RouteWrapper> },
  { path: "/forgot-password",       element: <RouteWrapper><ForgotPasswordPage /></RouteWrapper> },
  { path: "/reset-password",        element: <RouteWrapper><ResetPasswordPage /></RouteWrapper> },
  { path: "/verify-email",          element: <RouteWrapper><VerifyEmailPage /></RouteWrapper> },
  { path: "/auth/forgot-password",  element: <RouteWrapper><ForgotPasswordPage /></RouteWrapper> },
  { path: "/auth/reset-password",   element: <RouteWrapper><ResetPasswordPage /></RouteWrapper> },
  { path: "/auth/verify-email",     element: <RouteWrapper><VerifyEmailPage /></RouteWrapper> },
  { path: "/dashboard/*",           element: <RouteWrapper><DashboardPage /></RouteWrapper> },
  { path: "/demandas/*",            element: <RouteWrapper><DemandsPage /></RouteWrapper> },
  { path: "/propostas/*",           element: <RouteWrapper><ProposalList /></RouteWrapper> },
  { path: "/pedidos/*",             element: <RouteWrapper><OrdersPage /></RouteWrapper> },
  { path: "/contratos/*",           element: <RouteWrapper><ContractList /></RouteWrapper> },
  { path: "/maquinas/*",            element: <RouteWrapper><MachinesPage /></RouteWrapper> },
  { path: "/calendario/*",          element: <RouteWrapper><CalendarPage /></RouteWrapper> },
  { path: "/chat/*",                element: <RouteWrapper><MessagesPage /></RouteWrapper> },
  { path: "/financeiro/*",          element: <RouteWrapper><FinancialPage /></RouteWrapper> },
  { path: "/disputas/*",            element: <RouteWrapper><DisputeList /></RouteWrapper> },
  { path: "/avaliacoes/*",          element: <RouteWrapper><ReviewsPage /></RouteWrapper> },
  { path: "/qualidade/*",           element: <RouteWrapper><QualityPage /></RouteWrapper> },
  { path: "/verificacao/*",         element: <RouteWrapper><VerificationPage /></RouteWrapper> },
  { path: "/verificacao-admin/*",   element: <RouteWrapper><AdminVerificationPage /></RouteWrapper> },
  { path: "/empresas/*",            element: <RouteWrapper><CompaniesPage /></RouteWrapper> },
  { path: "/auditoria/*",           element: <RouteWrapper><AuditPage /></RouteWrapper> },
  { path: "/config/*",              element: <RouteWrapper><SettingsPage /></RouteWrapper> },
  { path: "/configuracoes/*",       element: <RouteWrapper><SettingsPage /></RouteWrapper> },
  { path: "/admin/*",               element: <RouteWrapper><ExecutiveDashboard /></RouteWrapper> },
  { path: "/contratos-recorrentes/*", element: <RouteWrapper><RecurringContractsPage /></RouteWrapper> },
  { path: "/nda/*",                 element: <RouteWrapper><NDAPage /></RouteWrapper> },
  { path: "/comparar/*",            element: <RouteWrapper><ProposalComparePage /></RouteWrapper> },
  { path: "/fornecedores/*",        element: <RouteWrapper><SuppliersPage /></RouteWrapper> },
  { path: "/nova-demanda/*",        element: <RouteWrapper><DemandWizard onPublish={async () => { window.location.href = "/demandas"; }} onCancel={() => window.history.back()} /></RouteWrapper> },
  { path: "/acompanhamento/*",      element: <RouteWrapper><OrderTrackingPage /></RouteWrapper> },

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
        <ToastContainer />
        <CookieBanner privacyUrl="/privacidade" />
      </I18nProvider>
    </ErrorBoundary>
  );
}
