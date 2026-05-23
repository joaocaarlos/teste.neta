/**
 * Unit tests for ContractList.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Module mocks ─────────────────────────────────────────────────────────────

// ContractList uses useContracts which calls useQuery (fetch-based hook).
// Mock global fetch so the hook stays in loading state initially.
vi.stubGlobal(
  "fetch",
  vi.fn(() => new Promise(() => {})) // never resolves → loading = true
);

// ─── Component under test ─────────────────────────────────────────────────────

import { ContractList } from "./ContractList";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ContractList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {}))
    );
  });

  it("renders without crashing", () => {
    const { container } = render(<ContractList />);
    expect(container.firstChild).not.toBeNull();
  });

  it("shows loading skeleton (animate-pulse divs) while data is loading", () => {
    const { container } = render(<ContractList />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders inside a container element (structural smoke test)", () => {
    const { container } = render(<ContractList />);
    expect(container.querySelector("div")).not.toBeNull();
  });
});
