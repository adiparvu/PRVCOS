/**
 * Real-PostgreSQL integration tests for the audit hash chain (audit R5/P1.5).
 *
 * Unlike gate-chain.integration.test.ts (an in-memory simulation), these run
 * writeAuditLog and verifyAuditChain against an actual database — including
 * the two tamper scenarios the daily cron exists to catch. Skipped unless
 * TEST_DATABASE_URL points at a fully provisioned schema (see MIGRATIONS.md).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import postgres from "postgres"

const TEST_URL = process.env["TEST_DATABASE_URL"]
if (TEST_URL) process.env["DATABASE_URL"] = TEST_URL

describe.skipIf(!TEST_URL)("audit chain against real PostgreSQL", () => {
  let sql: postgres.Sql
  let companyId: string

  beforeAll(async () => {
    sql = postgres(TEST_URL!, { max: 2, prepare: false, onnotice: () => {} })
    const [row] = await sql<{ id: string }[]>`
      INSERT INTO companies (name, slug)
      VALUES ('Audit Chain Probe', ${`audit-probe-${Date.now()}`})
      RETURNING id`
    companyId = row!.id
  })

  afterAll(async () => {
    await sql`DELETE FROM audit_logs WHERE company_id = ${companyId}`.catch(() => {})
    await sql`DELETE FROM companies WHERE id = ${companyId}`.catch(() => {})
    await sql.end()
  })

  it("writes a linked chain and verifies it clean", async () => {
    const { writeAuditLog, verifyAuditChain } = await import("../../audit")

    for (const action of ["probe.one", "probe.two", "probe.three", "probe.four"]) {
      await writeAuditLog({ companyId, actorId: undefined, action, method: "POST" })
    }

    const rows = await sql<{ prev_hash: string; entry_hash: string }[]>`
      SELECT prev_hash, entry_hash FROM audit_logs
      WHERE company_id = ${companyId} ORDER BY sequence_number`
    expect(rows).toHaveLength(4)
    expect(rows[0]!.prev_hash).toBe("0".repeat(64))
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i]!.prev_hash).toBe(rows[i - 1]!.entry_hash)
    }

    const result = await verifyAuditChain(companyId)
    expect(result).toMatchObject({ companyId, checked: 4, valid: true })
  })

  it("detects a field edited after the fact (hash_mismatch)", async () => {
    const { verifyAuditChain } = await import("../../audit")

    await sql`
      UPDATE audit_logs SET action = 'probe.FORGED'
      WHERE company_id = ${companyId} AND action = 'probe.two'`

    const result = await verifyAuditChain(companyId)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe("hash_mismatch")

    await sql`
      UPDATE audit_logs SET action = 'probe.two'
      WHERE company_id = ${companyId} AND action = 'probe.FORGED'`
    expect((await verifyAuditChain(companyId)).valid).toBe(true)
  })

  it("detects a deleted entry (link_mismatch or hash break at the splice)", async () => {
    const { verifyAuditChain } = await import("../../audit")

    await sql`
      DELETE FROM audit_logs
      WHERE company_id = ${companyId} AND action = 'probe.three'`

    const result = await verifyAuditChain(companyId)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe("link_mismatch")
  })
})
