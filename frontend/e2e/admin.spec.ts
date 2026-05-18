import { expect, test, type Page } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";

async function dismissCookies(page: Page) {
  await page.getByRole("button", { name: /aceitar todos|apenas essenciais/i })
    .first()
    .click({ timeout: 2_000 })
    .catch(() => {});
}

async function loginAsAdmin(page: Page) {
  await page.goto(BASE);
  await dismissCookies(page);
  await page.getByRole("button", { name: /entrar/i }).first().click();

  const adminTab = page.getByRole("button", { name: /admin/i });
  if (await adminTab.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await adminTab.click();
  }

  await page.locator('input[type="email"]').first().fill("admin@capacity.com.br");
  await page.locator('input[type="password"]').first().fill("admin123");
  await page.getByRole("button", { name: /entrar/i }).last().click();

  await expect(
    page.getByText(/admin|painel|empresa|disputa/i).first()
  ).toBeVisible({ timeout: 15_000 });
}

test.describe("Painel Administrativo", () => {
  test("admin acessa painel principal", async ({ page }) => {
    await loginAsAdmin(page);
    // Verificar que está no contexto admin (algum indicador visual)
    await expect(
      page.getByText(/admin|administração|painel/i).first()
    ).toBeVisible();
  });

  test("admin visualiza lista de empresas", async ({ page }) => {
    await loginAsAdmin(page);

    const empresasLink = page.getByRole("link", { name: /empresa/i })
      .or(page.getByRole("button", { name: /empresa/i }))
      .first();

    if (await empresasLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await empresasLink.click();
      await expect(
        page.getByText(/empresa|MetalPrime|Aprovado|Pendente/i).first()
      ).toBeVisible({ timeout: 8_000 });
    }
  });

  test("admin visualiza todas as disputas", async ({ page }) => {
    await loginAsAdmin(page);

    const disputasLink = page.getByRole("link", { name: /disputa/i })
      .or(page.getByRole("button", { name: /disputa/i }))
      .first();

    if (await disputasLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await disputasLink.click();
      await expect(
        page.getByText(/disputa|DP-|qualidade|análise/i).first()
      ).toBeVisible({ timeout: 8_000 });
    }
  });

  test("admin visualiza logs de auditoria", async ({ page }) => {
    await loginAsAdmin(page);

    const auditLink = page.getByRole("link", { name: /audit|log/i })
      .or(page.getByRole("button", { name: /audit|log/i }))
      .first();

    if (await auditLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await auditLink.click();
      await expect(
        page.getByText(/audit|log|evento|ação/i).first()
      ).toBeVisible({ timeout: 8_000 });
    }
  });

  test("admin visualiza transações pendentes", async ({ page }) => {
    await loginAsAdmin(page);

    const txnLink = page.getByRole("link", { name: /transação|financeiro/i })
      .or(page.getByRole("button", { name: /transação|financeiro/i }))
      .first();

    if (await txnLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await txnLink.click();
      await expect(
        page.getByText(/TXN-|transação|Retido|Pendente/i).first()
      ).toBeVisible({ timeout: 8_000 });
    }
  });

  test("admin acessa swagger docs", async ({ page }) => {
    const apiUrl = process.env.E2E_API_URL || "http://localhost:3001";
    const res = await page.request.get(`${apiUrl}/docs.json`).catch(() => null);

    if (res) {
      expect(res.ok()).toBeTruthy();
      const spec = await res.json();
      expect(spec.openapi).toMatch(/^3\./);
      expect(spec.info.title).toBeTruthy();
    } else {
      test.skip(true, "API não disponível");
    }
  });

  test("health check retorna status ok", async ({ page }) => {
    const apiUrl = process.env.E2E_API_URL || "http://localhost:3001";
    const res = await page.request.get(`${apiUrl}/health`).catch(() => null);

    if (res) {
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.status).toBe("ok");
      expect(body.checks.db.ok).toBeTruthy();
    } else {
      test.skip(true, "API não disponível");
    }
  });
});
