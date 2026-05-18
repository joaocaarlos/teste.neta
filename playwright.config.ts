import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0, // 2 retries em CI (ex: flakiness)
  fullyParallel: !process.env.CI, // Executar em paralelo localmente
  workers: process.env.CI ? 1 : undefined, // 1 worker em CI para evitar race conditions
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure", // Screenshot apenas se falhar
    video: "retain-on-failure", // Vídeo apenas se falhar
  },
  reporter: [
    ["html"],
    ["junit", { outputFile: "test-results/junit.xml" }],
    ["list"],
  ],
  projects: [
    // Desktop
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },

    // Mobile
    { name: "Mobile Chrome", use: { ...devices["Pixel 5"] } },
    { name: "Mobile Safari", use: { ...devices["iPhone 12"] } },

    // Tablet
    { name: "iPad", use: { ...devices["iPad Pro"] } },
  ],
});
