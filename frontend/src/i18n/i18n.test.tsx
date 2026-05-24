import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { I18nProvider, useI18n } from "./index";

function TestConsumer() {
  const { t, locale, setLocale } = useI18n();
  return (
    <>
      <span data-testid="locale">{locale}</span>
      <span data-testid="login">{t("auth.login")}</span>
      <span data-testid="dashboard">{t("nav.dashboard")}</span>
      <button onClick={() => setLocale(locale === "pt-BR" ? "en-US" : "pt-BR")}>toggle</button>
    </>
  );
}

describe("I18nProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renderiza traduções em pt-BR quando salvo no localStorage", () => {
    localStorage.setItem("cap4_locale", "pt-BR");
    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>
    );
    expect(screen.getByTestId("login").textContent).toBe("Entrar");
    expect(screen.getByTestId("dashboard").textContent).toBe("Dashboard");
  });

  it("alterna locale via setLocale", () => {
    localStorage.setItem("cap4_locale", "pt-BR");
    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>
    );
    const initialLogin = screen.getByTestId("login").textContent;
    act(() => {
      screen.getByText("toggle").click();
    });
    const afterLogin = screen.getByTestId("login").textContent;
    expect(initialLogin).not.toBe(afterLogin);
  });

  it("persiste locale em localStorage após toggle", () => {
    localStorage.setItem("cap4_locale", "pt-BR");
    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>
    );
    act(() => {
      screen.getByText("toggle").click();
    });
    expect(localStorage.getItem("cap4_locale")).toBe("en-US");
  });

  it("respeita locale salva no init", () => {
    localStorage.setItem("cap4_locale", "en-US");
    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>
    );
    expect(screen.getByTestId("locale").textContent).toBe("en-US");
    expect(screen.getByTestId("login").textContent).toBe("Sign in");
  });

  it("chave inexistente retorna a própria chave (fallback)", () => {
    function MissingKey() {
      const { t } = useI18n();
      return <span>{t("inexistente.key" as never)}</span>;
    }
    render(
      <I18nProvider>
        <MissingKey />
      </I18nProvider>
    );
    expect(screen.getByText("inexistente.key")).toBeInTheDocument();
  });
});
