import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    name: "@prv/approval-engine",
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
    },
  },
})
