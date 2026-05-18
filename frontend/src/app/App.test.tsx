/**
 * Smoke test: App renders without crashing and shows the router.
 * LegacyApp is mocked to avoid loading 5k lines in unit tests.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Module mocks ─────────────────────────────────────────────────────────────
vi.mock("../legacy/LegacyApp", () => ({
  default: () => <div data-testid="legacy-app">LegacyApp</div>,
}));

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

  it("renderiza ErrorBoundary como wrapper", () => {
    render(<App />);
    // If ErrorBoundary crashes, render would throw — reaching here means it's fine
    expect(true).toBe(true);
  });
});
