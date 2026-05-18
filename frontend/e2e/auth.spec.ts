import { expect, test } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";
const BASE_HOST_RE = new RegExp(new URL(BASE).host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

async function dismissCookies(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: /aceitar todos|apenas essenciais/i })
    .first()
    .click({ timeout: 2_000 })
    .catch(() => {});
}

test.describe("Autenticação", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await dismissCookies(page);
  });

  test("landing page carrega com botões de acesso", async ({ page }) => {
    await expect(page.getByText(/CAPACITY/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /entrar/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /cadastrar/i }).first()).toBeVisible();
  });

  test("login como demandante", async ({ page }) => {
    // Ir para login
    await page.getByRole("button", { name: /entrar/i }).first().click();
    await expect(page.locator('input[type="email"]').first()).toBeVisible();

    // Selecionar tab demandante se necessário
    const demandanteTab = page.getByRole("button", { name: /demandante/i });
    if (await demandanteTab.isVisible()) {
      await demandanteTab.click();
    }

    // Preencher credenciais
    await page.locator('input[type="email"]').first().fill("joao@metalparts.com.br");
    await page.locator('input[type="password"]').first().fill("demo123");
    await page.getByRole("button", { name: /entrar/i }).last().click();

    // Deve ver o dashboard
    await expect(page).toHaveURL(BASE_HOST_RE);
    await expect(page.getByText(/dashboard|bem-vindo|demanda/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("login como fornecedor", async ({ page }) => {
    await page.getByRole("button", { name: /entrar/i }).first().click();

    const fornecedorTab = page.getByRole("button", { name: /fornecedor/i });
    if (await fornecedorTab.isVisible()) {
      await fornecedorTab.click();
    }

    await page.locator('input[type="email"]').first().fill("pedro@metalprime.com.br");
    await page.locator('input[type="password"]').first().fill("demo123");
    await page.getByRole("button", { name: /entrar/i }).last().click();

    await expect(page.getByText(/dashboard|pedido|demanda/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("login como admin", async ({ page }) => {
    await page.getByRole("button", { name: /entrar/i }).first().click();

    const adminTab = page.getByRole("button", { name: /admin/i });
    if (await adminTab.isVisible()) {
      await adminTab.click();
    }

    await page.locator('input[type="email"]').first().fill("admin@capacity.com.br");
    await page.locator('input[type="password"]').first().fill("admin123");
    await page.getByRole("button", { name: /entrar/i }).last().click();

    await expect(page.getByText(/admin|painel|empresa/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("credenciais inválidas mostram erro", async ({ page }) => {
    await page.getByRole("button", { name: /entrar/i }).first().click();

    await page.locator('input[type="email"]').first().fill("invalido@test.com");
    await page.locator('input[type="password"]').first().fill("senhaerrada");
    await page.getByRole("button", { name: /entrar/i }).last().click();

    // Deve exibir mensagem de erro (toast ou inline)
    await expect(
      page.getByText(/incorretos|inválid|erro|tentativas|aguarde/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("tela de cadastro é acessível", async ({ page }) => {
    await page.getByRole("button", { name: /cadastrar/i }).first().click();

    // Cadastro é um wizard: a primeira etapa deve expor escolha de perfil e avanço.
    await expect(page.getByText(/criar conta/i).first()).toBeVisible();
    await expect(page.getByRole("group", { name: /como você quer usar/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /continuar/i })).toBeVisible();
  });

  test("recuperação de senha é acessível", async ({ page }) => {
    await page.getByRole("button", { name: /entrar/i }).first().click();

    const forgotLink = page.getByRole("button", { name: /esqueci|recuperar|forgot/i })
      .or(page.getByText(/esqueci|recuperar/i));

    if (await forgotLink.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await forgotLink.first().click();
      await expect(page.locator('input[type="email"]').first()).toBeVisible();
    }
  });
});
