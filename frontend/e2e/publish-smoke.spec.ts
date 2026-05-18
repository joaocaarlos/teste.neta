import { expect, test } from "@playwright/test";

const apiUrl = process.env.E2E_API_URL || "http://localhost:3001";
const requireApi = process.env.E2E_REQUIRE_API === "true";

test("public app loads and auth screens are reachable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/CAPACITY/i).first()).toBeVisible();

  await page.getByRole("button", { name: /entrar/i }).first().click();
  await expect(page.getByText(/acessar plataforma/i).first()).toBeVisible();
  await expect(page.locator('input[type="password"]').first()).toBeVisible();
});

test("api readiness endpoint is available", async ({ request }) => {
  const res = await request.get(`${apiUrl}/health/live`).catch(() => null);
  test.skip(!res && !requireApi, `API not reachable at ${apiUrl}; set E2E_REQUIRE_API=true to fail this smoke check.`);
  expect(res).toBeTruthy();
  if (!res) return;
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.status).toBe("ok");
});
