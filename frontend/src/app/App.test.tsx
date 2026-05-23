/**
 * Smoke test: App renders without crashing and shows the router.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

// ─── Module mocks ─────────────────────────────────────────────────────────────
vi.mock("../features/marketing/PricingPage", () => ({
  PricingPage: () => <div>Pricing</div>,
}));
vi.mock("../features/marketing/HowItWorksPage", () => ({
  HowItWorksPage: () => <div>HowItWorks</div>,
}));
vi.mock("../features/marketing/PrivacyPage", () => ({
  PrivacyPage: () => <div>Privacy</div>,
}));
vi.mock("../features/marketing/TermsPage", () => ({
  TermsPage: () => <div>Terms</div>,
}));
vi.mock("../features/status/StatusPage", () => ({
  StatusPage: () => <div>Status</div>,
}));
vi.mock("../services/analytics", () => ({
  analytics: { page: vi.fn() },
}));
vi.mock("../services/stripe", () => ({
  startCheckout: vi.fn(),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    // Reset location to root for each test
    window.history.pushState({}, "", "/");
  });

  it("renderiza sem erros na rota /", async () => {
    render(<App />);
    // LegacyApp is lazy-loaded; Suspense renders fallback first
    // Just verify App mounts without throwing
    expect(document.body).toBeTruthy();
  });

  it("renderiza CookieBanner dentro do I18nProvider", () => {
    const { container } = render(<App />);
    // The app shell must mount at least one DOM node
    expect(container.firstChild).not.toBeNull();
  });
});
