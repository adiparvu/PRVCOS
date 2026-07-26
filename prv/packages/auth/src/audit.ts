import { db } from "@prv/db"
import { auditLogs } from "@prv/db"
import { eq, desc } from "drizzle-orm"

export interface AuditEntry {
  companyId: string
  actorId?: string
  sessionId?: string
  action: string
  entityType?: string
  entityId?: string
  payload?: Record<string, unknown>
  method?: string
  path?: string
  ipAddress?: string
  userAgent?: string
  gateFailed?: number
  errorCode?: string
  // JIT sysadmin context — set when action was taken during an active JIT session
  impersonatedBy?: string
  jitSessionId?: string
}

export async function sha256hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input)
  const digest = await globalThis.crypto.subtle.digest("SHA-256", encoded)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export function computeEntryHash(id: string, entry: AuditEntry, prevHash: string): Promise<string> {
  const input = [
    id,
    entry.companyId,
    entry.actorId ?? "",
    entry.action,
    entry.entityType ?? "",
    entry.entityId ?? "",
    JSON.stringify(entry.payload ?? {}),
    String(entry.gateFailed ?? 0),
    prevHash,
  ].join("|")
  return sha256hex(input)
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await writeAuditLogUnsafe(entry)
  } catch (err) {
    // Every caller void-fires this, so a persistent failure would be silent.
    // Count it in Redis — a different store than the audit table, so a
    // Postgres outage still leaves a trace for the chain-verify cron.
    console.error("[audit] write failed:", err instanceof Error ? err.message : err)
    try {
      const { getRedis } = await import("@prv/cache")
      await getRedis().incr(AUDIT_WRITE_FAILURE_KEY)
    } catch {
      // Redis down too — console.error above is the last resort.
    }
    throw err
  }
}

async function writeAuditLogUnsafe(entry: AuditEntry): Promise<void> {
  const id = crypto.randomUUID()

  await db.transaction(async (tx) => {
    const [last] = await tx
      .select({ entryHash: auditLogs.entryHash })
      .from(auditLogs)
      .where(eq(auditLogs.companyId, entry.companyId))
      .orderBy(desc(auditLogs.sequenceNumber))
      .limit(1)
      .for("update")

    const prevHash = last?.entryHash ?? "0".repeat(64)
    const entryHash = await computeEntryHash(id, entry, prevHash)

    await tx.insert(auditLogs).values({
      id,
      companyId: entry.companyId,
      actorId: entry.actorId,
      sessionId: entry.sessionId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      payload: entry.payload ?? null,
      method: entry.method,
      path: entry.path,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      impersonatedBy: entry.impersonatedBy,
      jitSessionId: entry.jitSessionId,
      gateFailed: entry.gateFailed ?? 0,
      errorCode: entry.errorCode,
      prevHash,
      entryHash,
    })
  })
}

// ── Write-failure visibility ──────────────────────────────────────────────
// Failures of writeAuditLog increment this Redis counter; the daily
// chain-verify cron turns a non-zero counter into a security event.

export const AUDIT_WRITE_FAILURE_KEY = "prv:audit:write_failures"

// ── Chain verification ────────────────────────────────────────────────────

export interface ChainVerificationResult {
  companyId: string
  checked: number
  valid: boolean
  /** sequenceNumber of the first broken entry, when invalid */
  brokenAtSequence?: number
  reason?: "hash_mismatch" | "link_mismatch"
}

interface ChainRow {
  id: string
  companyId: string
  actorId: string | null
  action: string
  entityType: string | null
  entityId: string | null
  payload: unknown
  gateFailed: number | null
  prevHash: string
  entryHash: string
  sequenceNumber: number
}

/**
 * Re-derive the hash chain over the most recent `windowSize` entries of one
 * company and compare with what is stored. Two failure modes:
 *  - link_mismatch: entry N's prevHash is not entry N-1's entryHash
 *  - hash_mismatch: an entry's stored entryHash does not match a recompute
 *    from its own stored fields (i.e. a field was edited after the fact)
 * The window's oldest entry has its link checked only if its predecessor is
 * inside the window.
 */
export async function verifyAuditChain(
  companyId: string,
  windowSize = 500
): Promise<ChainVerificationResult> {
  const recent = (await db
    .select({
      id: auditLogs.id,
      companyId: auditLogs.companyId,
      actorId: auditLogs.actorId,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      payload: auditLogs.payload,
      gateFailed: auditLogs.gateFailed,
      prevHash: auditLogs.prevHash,
      entryHash: auditLogs.entryHash,
      sequenceNumber: auditLogs.sequenceNumber,
    })
    .from(auditLogs)
    .where(eq(auditLogs.companyId, companyId))
    .orderBy(desc(auditLogs.sequenceNumber))
    .limit(windowSize)) as ChainRow[]

  // Oldest → newest for linkage checks.
  const rows = [...recent].reverse()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!
    if (i > 0 && row.prevHash !== rows[i - 1]!.entryHash) {
      return {
        companyId,
        checked: rows.length,
        valid: false,
        brokenAtSequence: row.sequenceNumber,
        reason: "link_mismatch",
      }
    }
    const recomputed = await computeEntryHash(
      row.id,
      {
        companyId: row.companyId,
        actorId: row.actorId ?? undefined,
        action: row.action,
        entityType: row.entityType ?? undefined,
        entityId: row.entityId ?? undefined,
        payload: (row.payload ?? undefined) as Record<string, unknown> | undefined,
        gateFailed: row.gateFailed ?? 0,
      },
      row.prevHash
    )
    if (recomputed !== row.entryHash) {
      return {
        companyId,
        checked: rows.length,
        valid: false,
        brokenAtSequence: row.sequenceNumber,
        reason: "hash_mismatch",
      }
    }
  }

  return { companyId, checked: rows.length, valid: true }
}
