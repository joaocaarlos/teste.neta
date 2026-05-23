/**
 * Unit tests for LoginPage.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock("../../app/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
    loginErr: "",
    loginLoading: false,
  }),
}));

vi.mock("../../components/ui/Input", () => ({
  Input: ({ label, type, value, onChange, placeholder, disabled }: any) => (
    <div>
      <label>{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  ),
}));

// ─── Component under test ─────────────────────────────────────────────────────

import { LoginPage } from "./LoginPage";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the login form with email and password fields", () => {
    const { container } = render(<LoginPage />);
    expect(container.firstChild).not.toBeNull();
    // Email field is rendered via the mocked Input component with label "E-mail"
    expect(screen.getByText("E-mail")).toBeInTheDocument();
    // Password label is rendered inline
    expect(screen.getByText("Senha")).toBeInTheDocument();
  });

  it('shows "Entrar" submit button', () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: /entrar/i })).toBeInTheDocument();
  });

  it("shows local error when email is empty and form is submitted", async () => {
    render(<LoginPage />);
    const submitBtn = screen.getByRole("button", { name: /entrar/i });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText("Informe o e-mail.")).toBeInTheDocument();
    });
  });

  it("shows local error when password is empty and email is filled", async () => {
    render(<LoginPage />);
    const emailInput = screen.getByPlaceholderText("seu@email.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    const submitBtn = screen.getByRole("button", { name: /entrar/i });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText("Informe a senha.")).toBeInTheDocument();
    });
  });

  it("renders role selector buttons", () => {
    render(<LoginPage />);
    expect(screen.getByText("Sou demandante")).toBeInTheDocument();
    expect(screen.getByText("Sou fornecedor")).toBeInTheDocument();
  });
});
