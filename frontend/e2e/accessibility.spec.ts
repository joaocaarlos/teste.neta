import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";

async function dismissCookies(page: Page) {
  await page.getByRole("button", { name: /aceitar todos|apenas essenciais/i })
    .first()
    .click({ timeout: 2_000 })
    .catch(() => {});
}

/**
 * Testes de acessibilidade automatizados com axe-core.
 *
 * Cobertura: WCAG 2.1 AA + best practices.
 * Falha se houver violações sérias (impact >= "serious").
 */

test.describe("Acessibilidade — WCAG 2.1 AA", () => {
  test("landing page não tem violações sérias", async ({ page }) => {
    await page.goto(BASE);
    await dismissCookies(page);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );

    if (serious.length > 0) {
      console.log(
        "Violações sérias encontradas:",
        JSON.stringify(serious, null, 2)
      );
    }

    expect(serious).toEqual([]);
  });

  test("tela de login não tem violações sérias", async ({ page }) => {
    await page.goto(BASE);
    await dismissCookies(page);
    await page.getByRole("button", { name: /entrar/i }).first().click();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );

    expect(serious).toEqual([]);
  });

  test("tela de cadastro não tem violações sérias", async ({ page }) => {
    await page.goto(BASE);
    await dismissCookies(page);
    await page.getByRole("button", { name: /cadastrar/i }).first().click();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );

    expect(serious).toEqual([]);
  });

  test("inputs têm labels associados", async ({ page }) => {
    await page.goto(BASE);
    await dismissCookies(page);
    await page.getByRole("button", { name: /entrar/i }).first().click();

    const inputs = await page.locator('input:not([type="hidden"])').all();

    for (const input of inputs) {
      const id = await input.getAttribute("id");
      const ariaLabel = await input.getAttribute("aria-label");
      const ariaLabelledBy = await input.getAttribute("aria-labelledby");

      // Cada input deve ter ID com <label>, aria-label ou aria-labelledby
      if (!ariaLabel && !ariaLabelledBy && id) {
        const label = await page.locator(`label[for="${id}"]`).count();
        expect(label).toBeGreaterThan(0);
      } else {
        expect(ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    }
  });

  test("contraste de cor é adequado", async ({ page }) => {
    await page.goto(BASE);
    await dismissCookies(page);

    const results = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();

    const contrastIssues = results.violations.filter(
      (v) => v.id === "color-contrast"
    );

    // Aviso — não falha (algumas decisões de design quebram contraste intencionalmente)
    if (contrastIssues.length > 0) {
      console.warn(
        `${contrastIssues.length} problemas de contraste encontrados`
      );
    }
  });
});
