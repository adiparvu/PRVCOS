import { validateServerEnv, validateClientEnv } from "./index"

// Validated server env — import in server components / API routes only
export const serverEnv = validateServerEnv(process.env)

// Validated client env — safe to use in client components
export const clientEnv = validateClientEnv({
  NODE_ENV: process.env["NODE_ENV"],
  NEXT_PUBLIC_SUPABASE_URL: process.env["NEXT_PUBLIC_SUPABASE_URL"],
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  NEXT_PUBLIC_APP_URL: process.env["NEXT_PUBLIC_APP_URL"],
  NEXT_PUBLIC_SENTRY_DSN: process.env["NEXT_PUBLIC_SENTRY_DSN"],
})
