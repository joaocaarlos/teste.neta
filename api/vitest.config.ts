import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    restoreMocks: true,
    clearMocks: true,

    // Give integration tests more time (real DB + migrations)
    testTimeout: 30_000,
    hookTimeout: 30_000,

    // Run test files sequentially so integration suites don't race on the DB
    fileParallelism: false,
    maxWorkers: 1,
    sequence: {
      concurrent: false,
    },

    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/__tests__/**",
        "src/index.ts",
        "src/cron/**",
        "src/lib/migrations.ts",
      ],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 40,
        statements: 50,
      },
    },

    // Use forks pool for proper process isolation in integration tests
    pool: "forks",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
