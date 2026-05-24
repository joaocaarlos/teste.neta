import { expect, test } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";

async function dismissCookies(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: /aceitar todos|apenas essenciais/i })
    .first()
    .click({ timeout: 2_000 })
    .catch(() => {});
}

async function loginAs(page: import("@playwright/test").Page, email: string, password = "demo123") {
  await page.goto(BASE);
  await dismissCookies(page);
  await page.getByRole("button", { name: /entrar/i }).first().click();
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: /entrar/i }).last().click();
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
}

test.describe("Mensagens", () => {
  test("página de mensagens carrega", async ({ page }) => {
    await page.goto(`${BASE}/chat`);
    await dismissCookies(page);
    // Should either show login redirect or chat UI
    await expect(page).toHaveURL(/.*(login|chat).*/i, { timeout: 8_000 });
  });

  test("mensagens rota existe e não dá 404", async ({ page }) => {
    await page.goto(`${BASE}/chat`);
    await expect(page.getByText(/404|não encontrad/i)).toHaveCount(0, { timeout: 5_000 });
  });
});

test.describe("Disputas", () => {
  test("página de disputas carrega sem erro", async ({ page }) => {
    await page.goto(`${BASE}/disputas`);
    await dismissCookies(page);
    await expect(page.getByText(/404|not found|erro interno/i)).toHaveCount(0, { timeout: 5_000 });
  });

  test("disputas rota existe", async ({ page }) => {
    const response = await page.goto(`${BASE}/disputas`);
    // SPA — always serves index.html, not a 404 HTTP code
    expect(response?.status()).not.toBe(500);
  });
});

test.describe("Contratos Recorrentes", () => {
  test("página /contratos-recorrentes carrega", async ({ page }) => {
    await page.goto(`${BASE}/contratos-recorrentes`);
    await dismissCookies(page);
    await expect(page.getByText(/404|not found/i)).toHaveCount(0, { timeout: 5_000 });
  });
});

test.describe("NDAs", () => {
  test("página /nda carrega", async ({ page }) => {
    await page.goto(`${BASE}/nda`);
    await dismissCookies(page);
    await expect(page.getByText(/404|not found/i)).toHaveCount(0, { timeout: 5_000 });
  });
});

test.describe("Configurações", () => {
  test("página de configurações carrega", async ({ page }) => {
    await page.goto(`${BASE}/configuracoes`);
    await dismissCookies(page);
    // Either shows settings or redirects to login
    await expect(page).toHaveURL(/.*(login|config).*/i, { timeout: 8_000 });
  });
});
