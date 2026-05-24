/**
 * Unit tests for SettingsPage.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("../../services/api", () => ({
  apiGet: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  apiPatch: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  apiFetch: vi.fn().mockResolvedValue({ ok: true }),
  apiPost: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../components/ui/Input", () => ({
  Input: ({ label }: { label: string }) => <div>{label}</div>,
}));

// ─── Component under test ─────────────────────────────────────────────────────

import { SettingsPage } from "./SettingsPage";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    const { container } = render(<SettingsPage />);
    expect(container.firstChild).not.toBeNull();
  });

  it("renders all four navigation tabs", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("button", { name: /perfil/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /segurança/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /notificações/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /privacidade/i })).toBeInTheDocument();
  });
});
