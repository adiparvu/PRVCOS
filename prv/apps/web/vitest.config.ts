import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    name: "@prv/web",
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    // 200 test files race for CPU under turbo's parallel run; four suites
    // (message-actions, schedule-conflict, project-risks, payroll-items) hit
    // the 5s default under load while passing instantly in isolation (D8).
    // The timeout covers scheduling starvation, not slow code.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
    },
  },
})
