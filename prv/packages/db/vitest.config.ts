import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    name: "@prv/db",
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
})
