import { defineConfig } from "@playwright/test"
import { existsSync } from "node:fs"

// E2E smoke suite (audit P2.9). Deliberately NOT part of the unit gate: it
// boots the real Next.js server, so it needs a provisioned database
// (E2E_DATABASE_URL — same provisioning as the integration tests, see
// packages/db/MIGRATIONS.md). Supabase/Redis/etc. use inert stubs: auth
// resolves to "no user" and the edge rate limiter fails open, which is
// exactly the unauthenticated surface the smoke suite exercises.
//
// Run: pnpm --filter @prv/web test:e2e   (requires E2E_DATABASE_URL)

const PORT = Number(process.env["E2E_PORT"] ?? 3100)

const stubEnv = {
  NODE_ENV: "test",
  DATABASE_URL: process.env["E2E_DATABASE_URL"] ?? "",
  DATABASE_DIRECT_URL: process.env["E2E_DATABASE_URL"] ?? "",
  SUPABASE_URL: "https://e2e-stub.supabase.co",
  NEXT_PUBLIC_SUPABASE_URL: "https://e2e-stub.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-stub-anon-key",
  NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
  SUPABASE_SERVICE_ROLE_KEY: "e2e-stub-service-role-key",
  SUPABASE_JWT_SECRET: "e2e-stub-jwt-secret-min-32-characters",
  UPSTASH_REDIS_REST_URL: "https://e2e-stub.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "e2e-stub-redis-token",
  INNGEST_SIGNING_KEY: "signkey-test-e2e-stub",
  INNGEST_EVENT_KEY: "e2e-stub-inngest-event-key",
  RESEND_API_KEY: "re_e2e_stub_key",
  TYPESENSE_ADMIN_API_KEY: "e2e-stub-typesense-key",
  TYPESENSE_SEARCH_API_KEY: "e2e-stub-typesense-search-key",
  TYPESENSE_HOST: "e2e-stub.typesense.net",
  ANTHROPIC_API_KEY: "sk-ant-e2e-stub-key",
}

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"] ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Some sandboxes pre-install Chromium outside Playwright's registry;
    // use it when present, otherwise fall back to the registry download
    // (CI runs `playwright install chromium`).
    ...(existsSync("/opt/pw-browsers/chromium")
      ? { launchOptions: { executablePath: "/opt/pw-browsers/chromium" } }
      : {}),
  },
  webServer: {
    command: `pnpm next dev --port ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env["CI"],
    timeout: 180_000,
    env: stubEnv,
  },
})
