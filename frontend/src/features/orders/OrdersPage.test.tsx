/**
 * Unit tests for OrdersPage.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("../../services/api", () => ({
  apiGetList: vi.fn().mockResolvedValue([]),
  apiPost: vi.fn().mockResolvedValue({ data: {} }),
}));

vi.mock("../../utils", () => ({
  normOrder: (o: unknown) => o,
}));

// ─── Component under test ─────────────────────────────────────────────────────

import { OrdersPage } from "./OrdersPage";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("OrdersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    const { container } = render(<OrdersPage />);
    expect(container.firstChild).not.toBeNull();
  });

  it("shows loading state initially", () => {
    render(<OrdersPage />);
    // While data is loading the subtitle shows "Carregando…"
    expect(screen.getByText("Carregando…")).toBeInTheDocument();
  });

  it("renders the page title with Pedidos", () => {
    render(<OrdersPage />);
    expect(screen.getByText("Meus Pedidos")).toBeInTheDocument();
  });
});
