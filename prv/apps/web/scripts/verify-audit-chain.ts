#!/usr/bin/env tsx
/**
 * CLI: verify the SHA-256 audit log chain integrity for a company.
 *
 * Usage:
 *   pnpm tsx scripts/verify-audit-chain.ts <companyId> [from] [to]
 *
 * Example:
 *   pnpm tsx scripts/verify-audit-chain.ts abc-123
 *   pnpm tsx scripts/verify-audit-chain.ts abc-123 2026-01-01 2026-12-31
 */

import { db, auditLogs } from "@prv/db"
import { computeEntryHash } from "@prv/auth"
import { eq, and, gte, lte, asc } from "drizzle-orm"

async function main() {
  const [, , companyId, from, to] = process.argv

  if (!companyId) {
    console.error("Usage: verify-audit-chain <companyId> [from] [to]")
    process.exit(1)
  }

  const conditions = [eq(auditLogs.companyId, companyId)]
  if (from) conditions.push(gte(auditLogs.createdAt, new Date(from)))
  if (to) conditions.push(lte(auditLogs.createdAt, new Date(to)))

  const rows = await db
    .select()
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(asc(auditLogs.sequenceNumber))

  if (rows.length === 0) {
    console.log("No audit log entries found for the given criteria.")
    process.exit(0)
  }

  console.log(`Verifying ${rows.length} entries for company ${companyId}…\n`)

  let broken = 0
  let expectedPrevHash = "0".repeat(64)

  for (const row of rows) {
    // Verify prevHash matches the expected value
    if (row.prevHash !== expectedPrevHash) {
      console.error(
        `  ✗ seq=${row.sequenceNumber} id=${row.id}: prevHash mismatch\n` +
          `    expected: ${expectedPrevHash}\n` +
          `    got:      ${row.prevHash}`
      )
      broken++
    }

    // Re-compute the entry hash and compare
    const entry = {
      companyId: row.companyId,
      actorId: row.actorId ?? undefined,
      action: row.action,
      entityType: row.entityType ?? undefined,
      entityId: row.entityId ?? undefined,
      payload: (row.payload as Record<string, unknown>) ?? undefined,
      gateFailed: row.gateFailed,
    }

    const recomputed = await computeEntryHash(row.id, entry, row.prevHash)

    if (recomputed !== row.entryHash) {
      console.error(
        `  ✗ seq=${row.sequenceNumber} id=${row.id}: entryHash mismatch\n` +
          `    expected: ${recomputed}\n` +
          `    got:      ${row.entryHash}`
      )
      broken++
    } else {
      process.stdout.write(`  ✓ seq=${row.sequenceNumber}\n`)
    }

    expectedPrevHash = row.entryHash
  }

  console.log(`\n${rows.length} entries checked, ${broken} broken.`)
  process.exit(broken > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
