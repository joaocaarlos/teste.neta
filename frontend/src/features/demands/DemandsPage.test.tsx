/**
 * Unit tests for DemandsPage.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("../../services/api", () => ({
  apiGetList: vi.fn().mockResolvedValue([]),
  apiDelete: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../utils", () => ({
  normDemand: (d: unknown) => d,
}));

vi.mock("../../hooks/useWindowSize", () => ({
  useWindowSize: () => ({ isMobile: false, width: 1024, height: 768 }),
}));

// ─── Component under test ─────────────────────────────────────────────────────

import { DemandsPage } from "./DemandsPage";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DemandsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    const { container } = render(<DemandsPage />);
    expect(container.firstChild).not.toBeNull();
  });

  it("shows loading state initially", () => {
    render(<DemandsPage />);
    // While data is loading the subtitle shows "Carregando…"
    expect(screen.getByText("Carregando…")).toBeInTheDocument();
  });

  it("renders the correct page title", () => {
    render(<DemandsPage />);
    expect(screen.getByText("Minhas Demandas")).toBeInTheDocument();
  });
});
