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
      gateFailed: entry.gateFailed ?? 0,
      errorCode: entry.errorCode,
      prevHash,
      entryHash,
    })
  })
}
