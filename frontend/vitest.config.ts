import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "json-summary"],
      include: ["src/components/**", "src/utils/**", "src/hooks/**", "src/services/**", "src/i18n/**"],
      exclude: ["src/legacy/**", "**/*.test.{ts,tsx}", "**/test-setup.ts"],
    },
  },
});
