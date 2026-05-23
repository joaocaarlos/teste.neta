/**
 * Unit tests for DashboardPage.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children }: any) => children,
}));

vi.mock("../../app/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: "1",
      name: "Test User",
      role: "demandante",
      company_id: "c1",
      email_verified: true,
      onboarding_completed: true,
    },
    logout: vi.fn(),
  })),
}));

vi.mock("../../services/api", () => ({
  apiGet: vi.fn().mockResolvedValue({ data: {} }),
  apiGetList: vi.fn().mockResolvedValue([]),
  apiPost: vi.fn().mockResolvedValue({ data: {} }),
  apiPatch: vi.fn().mockResolvedValue({ data: {} }),
}));

vi.mock("../../utils", () => ({
  normDemand: (d: unknown) => d,
  normOrder: (o: unknown) => o,
  normProposal: (p: unknown) => p,
}));

vi.mock("../../hooks/useWindowSize", () => ({
  useWindowSize: () => ({ isMobile: false, width: 1024, height: 768 }),
}));

vi.mock("../../i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "pt-BR",
    setLocale: vi.fn(),
  }),
}));

// ─── Component under test ─────────────────────────────────────────────────────

import { DashboardPage } from "./DashboardPage";
import { useAuth } from "../../app/AuthContext";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing for role=demandante", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "1",
        name: "Test User",
        role: "demandante",
        company_id: "c1",
        email_verified: true,
        onboarding_completed: true,
      },
      logout: vi.fn(),
    } as any);

    const { container } = render(<DashboardPage />);
    expect(container.firstChild).not.toBeNull();
  });

  it("renders without crashing for role=fornecedor", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "2",
        name: "Supplier User",
        role: "fornecedor",
        company_id: "c2",
        email_verified: true,
        onboarding_completed: true,
      },
      logout: vi.fn(),
    } as any);

    const { container } = render(<DashboardPage />);
    expect(container.firstChild).not.toBeNull();
  });

  it("renders without crashing for role=admin", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "3",
        name: "Admin User",
        role: "admin",
        company_id: "c3",
        email_verified: true,
        onboarding_completed: true,
      },
      logout: vi.fn(),
    } as any);

    const { container } = render(<DashboardPage />);
    expect(container.firstChild).not.toBeNull();
  });
});
