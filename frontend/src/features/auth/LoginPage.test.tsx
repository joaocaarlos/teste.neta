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

vi.mock("@react-oauth/google", () => ({
  GoogleLogin: ({ onError }: any) => (
    <button type="button" onClick={onError}>
      Login com Google
    </button>
  ),
  GoogleOAuthProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock("../../app/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    login: vi.fn().mockResolvedValue(undefined),
    loginGoogle: vi.fn().mockResolvedValue(undefined),
    verify3fa: vi.fn().mockResolvedValue(undefined),
    resend3fa: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
    loginErr: "",
    loginLoading: false,
  }),
}));

vi.mock("../../utils/constants", () => ({
  DEMO_USERS: {
    demandante: { email: "joao@metalparts.com.br", password: "demo123" },
    fornecedor:  { email: "pedro@metalprime.com.br",  password: "demo123" },
    admin:       { email: "admin@capacity.com.br",    password: "admin123" },
  },
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
    expect(screen.getByText("E-mail")).toBeInTheDocument();
    expect(screen.getByText("Senha")).toBeInTheDocument();
  });

  it('shows "Entrar na Plataforma" submit button', () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: /entrar na plataforma/i })).toBeInTheDocument();
  });

  it("renders all three role tabs", () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: /demandante/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /fornecedor/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /admin/i })).toBeInTheDocument();
  });

  it("shows demo credentials panel", () => {
    render(<LoginPage />);
    expect(screen.getByText("CREDENCIAIS DEMO PREENCHIDAS")).toBeInTheDocument();
  });

  it("pre-fills demo credentials for demandante by default", () => {
    render(<LoginPage />);
    const emailInput = screen.getByPlaceholderText("seu@email.com") as HTMLInputElement;
    expect(emailInput.value).toBe("joao@metalparts.com.br");
  });

  it("switches credentials when fornecedor tab is clicked", async () => {
    render(<LoginPage />);
    const fornecedorBtn = screen.getByRole("button", { name: /fornecedor/i });
    fireEvent.click(fornecedorBtn);
    await waitFor(() => {
      const emailInput = screen.getByPlaceholderText("seu@email.com") as HTMLInputElement;
      expect(emailInput.value).toBe("pedro@metalprime.com.br");
    });
  });

  it("switches credentials when admin tab is clicked", async () => {
    render(<LoginPage />);
    const adminBtn = screen.getByRole("button", { name: /admin/i });
    fireEvent.click(adminBtn);
    await waitFor(() => {
      const emailInput = screen.getByPlaceholderText("seu@email.com") as HTMLInputElement;
      expect(emailInput.value).toBe("admin@capacity.com.br");
    });
  });

  it("shows local error when email is cleared and form is submitted", async () => {
    render(<LoginPage />);
    const emailInput = screen.getByPlaceholderText("seu@email.com");
    fireEvent.change(emailInput, { target: { value: "" } });
    const submitBtn = screen.getByRole("button", { name: /entrar na plataforma/i });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText("Informe o e-mail.")).toBeInTheDocument();
    });
  });

  it("shows local error when password is cleared and email is filled", async () => {
    render(<LoginPage />);
    const pwdInput = screen.getByPlaceholderText("••••••••");
    fireEvent.change(pwdInput, { target: { value: "" } });
    const submitBtn = screen.getByRole("button", { name: /entrar na plataforma/i });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText("Informe a senha.")).toBeInTheDocument();
    });
  });

  it("shows VOLTAR PARA A LANDING link", () => {
    render(<LoginPage />);
    expect(screen.getByText(/VOLTAR PARA A LANDING/i)).toBeInTheDocument();
  });

  it("renders Google login button", () => {
    render(<LoginPage />);
    expect(screen.getByText("Login com Google")).toBeInTheDocument();
  });
});
