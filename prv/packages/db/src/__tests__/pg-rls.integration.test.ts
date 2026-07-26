/**
 * Real-PostgreSQL integration tests for the RLS lockdown (audit P0.2/P1.5).
 *
 * Runs ONLY when TEST_DATABASE_URL points at a database provisioned with the
 * full schema + rls-lockdown.sql (see MIGRATIONS.md); skipped otherwise so the
 * default gate stays green without a database. Every prior test in this repo
 * mocks @prv/db — these deliberately do not: the 18-failed-migrations incident
 * proved mocks cannot catch schema/SQL reality.
 *
 * Provision locally:
 *   createdb prv_int && psql -d prv_int -c "CREATE EXTENSION pgcrypto; CREATE EXTENSION vector"
 *   DATABASE_URL=... npx drizzle-kit push --force
 *   psql <url> -f migrations/rls-lockdown.sql
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import postgres from "postgres"

const TEST_URL = process.env["TEST_DATABASE_URL"]

describe.skipIf(!TEST_URL)("RLS lockdown on the real schema", () => {
  let sql: postgres.Sql
  const cleanupCompanies: string[] = []

  beforeAll(() => {
    sql = postgres(TEST_URL!, { max: 2, prepare: false, onnotice: () => {} })
  })

  afterAll(async () => {
    for (const id of cleanupCompanies) {
      await sql`DELETE FROM companies WHERE id = ${id}`.catch(() => {})
    }
    await sql`DROP ROLE IF EXISTS prv_rls_probe`.catch(() => {})
    await sql.end()
  })

  it("every public table has row security enabled", async () => {
    const [row] = await sql<{ total: string; enabled: string }[]>`
      SELECT count(*)::text AS total,
             count(*) FILTER (WHERE rowsecurity)::text AS enabled
      FROM pg_tables WHERE schemaname = 'public'
    `
    expect(Number(row!.total)).toBeGreaterThanOrEqual(179)
    expect(row!.enabled).toBe(row!.total)
  })

  it("every table carrying company_id has the company_isolation policy", async () => {
    const [row] = await sql<{ with_col: string; with_policy: string }[]>`
      SELECT
        (SELECT count(DISTINCT c.table_name)
           FROM information_schema.columns c
           JOIN pg_tables t ON t.schemaname='public' AND t.tablename=c.table_name
          WHERE c.table_schema='public' AND c.column_name='company_id')::text AS with_col,
        (SELECT count(DISTINCT tablename) FROM pg_policies
          WHERE schemaname='public' AND policyname='company_isolation')::text AS with_policy
    `
    expect(row!.with_policy).toBe(row!.with_col)
    expect(Number(row!.with_col)).toBeGreaterThan(100)
  })

  it("a non-owner role is default-denied, and SET LOCAL app.company_id scopes to one tenant", async () => {
    // Two tenants with one client each, written as the owner (the app path).
    const [a] = await sql<{ id: string }[]>`
      INSERT INTO companies (name, slug) VALUES ('RLS Probe A', ${`rls-probe-a-${Date.now()}`})
      RETURNING id`
    const [b] = await sql<{ id: string }[]>`
      INSERT INTO companies (name, slug) VALUES ('RLS Probe B', ${`rls-probe-b-${Date.now()}`})
      RETURNING id`
    cleanupCompanies.push(a!.id, b!.id)
    await sql`INSERT INTO clients (company_id, name) VALUES (${a!.id}, 'Client A')`
    await sql`INSERT INTO clients (company_id, name) VALUES (${b!.id}, 'Client B')`

    await sql`DROP ROLE IF EXISTS prv_rls_probe`
    await sql`CREATE ROLE prv_rls_probe NOLOGIN`
    await sql`GRANT USAGE ON SCHEMA public TO prv_rls_probe`
    await sql`GRANT SELECT ON ALL TABLES IN SCHEMA public TO prv_rls_probe`

    // Default-deny: the probe role sees nothing without the session variable.
    const denied = await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE prv_rls_probe`
      return tx<{ n: string }[]>`SELECT count(*)::text AS n FROM clients`
    })
    expect(denied[0]!.n).toBe("0")

    // Tenant-scoped: with app.company_id set, exactly tenant A's rows appear.
    const scoped = await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE prv_rls_probe`
      await tx`SELECT set_config('app.company_id', ${a!.id}, true)`
      return tx<{ name: string; company_id: string }[]>`SELECT name, company_id FROM clients`
    })
    expect(scoped.every((r) => r.company_id === a!.id)).toBe(true)
    expect(scoped.some((r) => r.name === "Client A")).toBe(true)
    expect(scoped.some((r) => r.name === "Client B")).toBe(false)

    // The owner (app path, BYPASSRLS-equivalent) still sees both.
    const owner = await sql<{ n: string }[]>`
      SELECT count(*)::text AS n FROM clients
      WHERE company_id IN (${a!.id}, ${b!.id})`
    expect(owner[0]!.n).toBe("2")
  })
})
