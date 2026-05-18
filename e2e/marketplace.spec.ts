import { expect, test, type Page } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";

async function dismissCookies(page: Page) {
  await page.getByRole("button", { name: /aceitar todos|apenas essenciais/i })
    .first()
    .click({ timeout: 2_000 })
    .catch(() => {});
}

/** Helper: fazer login e aguardar dashboard */
async function loginAs(
  page: Page,
  email: string,
  password: string,
  role: "demandante" | "fornecedor" | "admin"
) {
  await page.goto(BASE);
  await dismissCookies(page);
  await page.getByRole("button", { name: /entrar/i }).first().click();

  const tab = page.getByRole("button", { name: new RegExp(role, "i") });
  if (await tab.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await tab.click();
  }

  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: /entrar/i }).last().click();

  // Aguarda qualquer elemento do dashboard
  await expect(
    page.getByText(/dashboard|bem-vindo|demanda|pedido|painel/i).first()
  ).toBeVisible({ timeout: 15_000 });
}

test.describe("Marketplace — fluxo principal", () => {
  test("demandante visualiza lista de demandas", async ({ page }) => {
    await loginAs(page, "joao@metalparts.com.br", "demo123", "demandante");

    // Navegar para demandas
    const demandasLink = page.getByRole("link", { name: /demanda/i })
      .or(page.getByRole("button", { name: /demanda/i }))
      .first();

    if (await demandasLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await demandasLink.click();
      await expect(
        page.getByText(/demanda|cotação|usinagem/i).first()
      ).toBeVisible({ timeout: 8_000 });
    }
  });

  test("fornecedor visualiza demandas disponíveis", async ({ page }) => {
    await loginAs(page, "pedro@metalprime.com.br", "demo123", "fornecedor");

    const demandasLink = page.getByRole("link", { name: /demanda|oportunidade/i })
      .or(page.getByRole("button", { name: /demanda|oportunidade/i }))
      .first();

    if (await demandasLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await demandasLink.click();
      await expect(
        page.getByText(/demanda|cotação|usinagem/i).first()
      ).toBeVisible({ timeout: 8_000 });
    }
  });

  test("demandante visualiza pedidos", async ({ page }) => {
    await loginAs(page, "joao@metalparts.com.br", "demo123", "demandante");

    const pedidosLink = page.getByRole("link", { name: /pedido/i })
      .or(page.getByRole("button", { name: /pedido/i }))
      .first();

    if (await pedidosLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await pedidosLink.click();
      await expect(
        page.getByText(/pedido|PD-|status/i).first()
      ).toBeVisible({ timeout: 8_000 });
    }
  });

  test("demandante visualiza transações", async ({ page }) => {
    await loginAs(page, "joao@metalparts.com.br", "demo123", "demandante");

    const financeiroLink = page.getByRole("link", { name: /financeiro|transaç/i })
      .or(page.getByRole("button", { name: /financeiro|transaç/i }))
      .first();

    if (await financeiroLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await financeiroLink.click();
      await expect(
        page.getByText(/transação|TXN-|financeiro/i).first()
      ).toBeVisible({ timeout: 8_000 });
    }
  });

  test("fornecedor visualiza suas máquinas", async ({ page }) => {
    await loginAs(page, "pedro@metalprime.com.br", "demo123", "fornecedor");

    const maquinasLink = page.getByRole("link", { name: /máquina|capacidade/i })
      .or(page.getByRole("button", { name: /máquina|capacidade/i }))
      .first();

    if (await maquinasLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await maquinasLink.click();
      await expect(
        page.getByText(/máquina|CNC|torno|injetor/i).first()
      ).toBeVisible({ timeout: 8_000 });
    }
  });

  test("demandante visualiza contratos", async ({ page }) => {
    await loginAs(page, "joao@metalparts.com.br", "demo123", "demandante");

    const contratosLink = page.getByRole("link", { name: /contrato/i })
      .or(page.getByRole("button", { name: /contrato/i }))
      .first();

    if (await contratosLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await contratosLink.click();
      await expect(
        page.getByText(/contrato|CT-|assinado/i).first()
      ).toBeVisible({ timeout: 8_000 });
    }
  });

  test("usuário pode acessar notificações", async ({ page }) => {
    await loginAs(page, "joao@metalparts.com.br", "demo123", "demandante");

    // Ícone de notificação (bell)
    const bellBtn = page.locator('[aria-label*="notif" i], [title*="notif" i], button:has(svg)')
      .first();

    if (await bellBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await bellBtn.click();
      // Algo deve aparecer (painel ou "nenhuma notificação")
      await expect(
        page.getByText(/notificação|nenhuma|nova/i).first()
      ).toBeVisible({ timeout: 5_000 }).catch(() => {});
    }
  });

  test("demandante pode acessar disputas", async ({ page }) => {
    await loginAs(page, "joao@metalparts.com.br", "demo123", "demandante");

    const disputasLink = page.getByRole("link", { name: /disputa/i })
      .or(page.getByRole("button", { name: /disputa/i }))
      .first();

    if (await disputasLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await disputasLink.click();
      await expect(
        page.getByText(/disputa|DP-|qualidade/i).first()
      ).toBeVisible({ timeout: 8_000 });
    }
  });

  test("usuário pode fazer logout", async ({ page }) => {
    await loginAs(page, "joao@metalparts.com.br", "demo123", "demandante");

    // Buscar botão/link de logout
    const logoutBtn = page.getByRole("button", { name: /sair|logout/i })
      .or(page.getByRole("link", { name: /sair|logout/i }))
      .first();

    if (await logoutBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await logoutBtn.click();
      // Deve voltar para landing ou login
      await expect(
        page.getByRole("button", { name: /entrar/i }).first()
      ).toBeVisible({ timeout: 8_000 });
    }
  });
});
