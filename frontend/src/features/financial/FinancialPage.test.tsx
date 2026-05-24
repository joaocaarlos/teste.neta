/**
 * Unit tests for FinancialPage.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("../../services/api", () => ({
  apiGet: vi.fn().mockResolvedValue({ ok: true, data: [] }),
}));

vi.mock("../../utils", () => ({
  normTxn: (t: unknown) => t,
}));

vi.mock("../../hooks/useWindowSize", () => ({
  useWindowSize: () => ({ isMobile: false, width: 1024, height: 768 }),
}));

// ─── Component under test ─────────────────────────────────────────────────────

import { FinancialPage } from "./FinancialPage";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("FinancialPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    const { container } = render(<FinancialPage />);
    expect(container.firstChild).not.toBeNull();
  });

  it('shows "Financeiro" title', () => {
    render(<FinancialPage />);
    expect(screen.getByText("Financeiro")).toBeInTheDocument();
  });
});
