import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema/index"

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>

let instance: DrizzleDb | null = null

// Lazily create the connection on first use. This keeps `import { db }` free of
// side effects — the production build and type-only imports don't need
// DATABASE_URL — while still failing loudly the moment a query actually runs
// without it. postgres.js itself only opens a socket on the first query.
function getDb(): DrizzleDb {
  if (instance) return instance
  const connectionString = process.env["DATABASE_URL"]
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required")
  }
  // PgBouncer-compatible: disable prepared statements
  const client = postgres(connectionString, { prepare: false })
  instance = drizzle(client, { schema })
  return instance
}

// Transparent lazy singleton: forwards every property access to the real
// Drizzle instance, binding methods so `this` resolves correctly.
export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<PropertyKey, unknown>
    const value = real[prop]
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(real)
      : value
  },
}) as DrizzleDb

export type Database = DrizzleDb
