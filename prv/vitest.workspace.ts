import { defineWorkspace } from "vitest/config"

export default defineWorkspace([
  "packages/cache/vitest.config.ts",
  "packages/validators/vitest.config.ts",
  "packages/auth/vitest.config.ts",
])
