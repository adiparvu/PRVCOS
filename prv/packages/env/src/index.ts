import { z } from "zod"

// Shared env variables used by all apps
const sharedSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
})

// Server-only env variables
export const serverEnvSchema = sharedSchema.extend({
  // Supabase
  DATABASE_URL: z.string().url().describe("Supabase PostgreSQL connection string (PgBouncer)"),
  DATABASE_DIRECT_URL: z.string().url().describe("Supabase direct connection (migrations only)"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1)
    .describe("Supabase service role key (server only — never expose to client)"),

  // Auth
  SUPABASE_JWT_SECRET: z.string().min(32).describe("Supabase JWT secret for token verification"),

  // Inngest
  INNGEST_SIGNING_KEY: z.string().min(1),
  INNGEST_EVENT_KEY: z.string().min(1),

  // Redis (Upstash)
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  // Email
  RESEND_API_KEY: z.string().startsWith("re_"),

  // Typesense
  TYPESENSE_ADMIN_API_KEY: z.string().min(1),
  TYPESENSE_HOST: z.string().min(1),
  TYPESENSE_PORT: z.coerce.number().default(443),
  TYPESENSE_PROTOCOL: z.enum(["http", "https"]).default("https"),

  // AI
  ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-"),

  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
})

// Client-safe env variables (prefixed NEXT_PUBLIC_)
export const clientEnvSchema = sharedSchema.extend({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>
export type ClientEnv = z.infer<typeof clientEnvSchema>

export function validateServerEnv(env: NodeJS.ProcessEnv): ServerEnv {
  const parsed = serverEnvSchema.safeParse(env)
  if (!parsed.success) {
    console.error("❌ Invalid server environment variables:")
    console.error(parsed.error.flatten().fieldErrors)
    throw new Error("Invalid server environment variables")
  }
  return parsed.data
}

export function validateClientEnv(env: Record<string, string | undefined>): ClientEnv {
  const parsed = clientEnvSchema.safeParse(env)
  if (!parsed.success) {
    console.error("❌ Invalid client environment variables:")
    console.error(parsed.error.flatten().fieldErrors)
    throw new Error("Invalid client environment variables")
  }
  return parsed.data
}
