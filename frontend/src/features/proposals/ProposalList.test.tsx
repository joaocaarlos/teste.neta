/**
 * Unit tests for ProposalList.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Module mocks ─────────────────────────────────────────────────────────────

// ProposalList uses useProposals which calls useQuery (fetch-based hook).
// Mock global fetch so the hook stays in loading state initially.
vi.stubGlobal(
  "fetch",
  vi.fn(() => new Promise(() => {})) // never resolves → loading = true
);

// Mock the store (useStore / selectUser)
vi.mock("../../store", () => ({
  useStore: () => ({ id: "1", name: "Test", role: "fornecedor" }),
  selectUser: (s: unknown) => s,
}));

// ─── Component under test ─────────────────────────────────────────────────────

import { ProposalList } from "./ProposalList";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ProposalList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch to the pending-promise stub for each test
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {}))
    );
  });

  it("renders without crashing", () => {
    const { container } = render(<ProposalList />);
    expect(container.firstChild).not.toBeNull();
  });

  it("shows loading skeleton (animate-pulse divs) while data is loading", () => {
    const { container } = render(<ProposalList />);
    // Loading state renders animate-pulse skeleton cards
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders inside a container element (structural smoke test)", () => {
    const { container } = render(<ProposalList />);
    // Component always renders at least one wrapping div
    expect(container.querySelector("div")).not.toBeNull();
  });
});
