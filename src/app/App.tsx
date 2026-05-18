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
 *
 * Roteamento simples baseado em window.location.pathname — sem react-router
 * para evitar peso. Quando todas as features estiverem extraídas, plugar
 * react-router aqui é trivial (um arquivo).
 */

import { useEffect, useState, Suspense, lazy } from "react";
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

// Injeta CSS global uma única vez
if (typeof document !== "undefined" && !document.getElementById("cap4-global-css")) {
  const style = document.createElement("style");
  style.id = "cap4-global-css";
  style.textContent = GLOBAL_CSS;
  document.head.appendChild(style);
}

// ───── Roteador minimalista ────────────────────────────────────────────────
type Route =
  | { kind: "marketing"; page: "pricing" | "howItWorks" | "privacy" | "terms" }
  | { kind: "status" }
  | { kind: "legacy" }
  | { kind: "notFound" };

const PUBLIC_ROUTES: Record<string, Route> = {
  "/precos":         { kind: "marketing", page: "pricing"     },
  "/pricing":        { kind: "marketing", page: "pricing"     },
  "/como-funciona":  { kind: "marketing", page: "howItWorks"  },
  "/how-it-works":   { kind: "marketing", page: "howItWorks"  },
  "/privacidade":    { kind: "marketing", page: "privacy"     },
  "/privacy":        { kind: "marketing", page: "privacy"     },
  "/termos":         { kind: "marketing", page: "terms"       },
  "/terms":          { kind: "marketing", page: "terms"       },
  "/status":         { kind: "status" },
};

/**
 * Rotas que o LegacyApp já gerencia internamente (landing, login, auth, dashboard).
 * Tudo que cair aqui delega para o monolito; ele tem seu próprio roteador
 * baseado em scene + pathname.
 */
const LEGACY_PATHS = new Set([
  "/", "/login", "/cadastro", "/register",
  "/forgot", "/forgot-password", "/reset-password", "/verify-email",
  "/auth/forgot-password", "/auth/reset-password", "/auth/verify-email",
  "/dashboard", "/demandas", "/propostas", "/pedidos",
  "/contratos", "/maquinas", "/calendario", "/chat",
  "/financeiro", "/disputas", "/avaliacoes", "/qualidade",
  "/verificacao", "/verificacao-admin", "/empresas", "/auditoria", "/config",
  "/configuracoes", "/admin", "/contratos-recorrentes",
  "/nda", "/comparar", "/fornecedores", "/nova-demanda", "/acompanhamento",
]);

function normalizePath(pathname: string): string {
  if (pathname.length > 1) return pathname.replace(/\/+$/, "");
  return pathname;
}

function resolveRoute(pathname: string): Route {
  const normalizedPathname = normalizePath(pathname);

  // Marketing routes — match exato
  if (PUBLIC_ROUTES[normalizedPathname]) return PUBLIC_ROUTES[normalizedPathname];

  // Legacy paths — exato ou começando com (ex: /demandas/123)
  if (LEGACY_PATHS.has(normalizedPathname)) return { kind: "legacy" };
  for (const p of LEGACY_PATHS) {
    if (p !== "/" && normalizedPathname.startsWith(p + "/")) return { kind: "legacy" };
  }

  // Reset/verify levam token na query — também legacy
  if (normalizedPathname.includes("reset-password") || normalizedPathname.includes("verify-email")) {
    return { kind: "legacy" };
  }

  return { kind: "notFound" };
}

function navigate(to: string): void {
  window.history.pushState({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

// ───── Root component ──────────────────────────────────────────────────────
export default function App() {
  const [route, setRoute] = useState<Route>(() => resolveRoute(window.location.pathname));

  useEffect(() => {
    const onPop = () => {
      const next = resolveRoute(window.location.pathname);
      setRoute(next);
      analytics.page(window.location.pathname);
    };

    window.addEventListener("popstate", onPop);
    analytics.page(window.location.pathname);

    // Captura clicks em <a href="/..."> para navegação SPA sem reload
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href) return;
      if (target.getAttribute("target") === "_blank") return;
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;

      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;

      // Só intercepta se a rota for conhecida pelo nosso router
      const r = resolveRoute(url.pathname);
      if (r.kind !== "notFound") {
        e.preventDefault();
        navigate(`${url.pathname}${url.search}${url.hash}`);
      }
    };
    document.addEventListener("click", onClick);

    return () => {
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <ErrorBoundary>
      <I18nProvider>
        <Suspense fallback={<FullPageSpinner label="Carregando…" />}>
          {renderRoute(route)}
        </Suspense>
        <CookieBanner privacyUrl="/privacidade" />
      </I18nProvider>
    </ErrorBoundary>
  );
}

function renderRoute(route: Route) {
  switch (route.kind) {
    case "marketing":
      switch (route.page) {
        case "pricing":    return <PricingPage onCTA={() => navigate("/")} />;
        case "howItWorks": return <HowItWorksPage />;
        case "privacy":    return <PrivacyPage />;
        case "terms":      return <TermsPage />;
      }
      return null;

    case "status":
      return <StatusPage />;

    case "legacy":
      return <LegacyApp />;

    case "notFound":
      return (
        <NotFoundPage
          onHome={() => navigate("/")}
          onBack={() => window.history.back()}
        />
      );
  }
}
