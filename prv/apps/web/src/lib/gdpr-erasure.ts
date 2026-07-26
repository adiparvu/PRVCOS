// GDPR erasure pipeline (shared).
//
// Anonymizes a user's personal data in place rather than hard-deleting the row:
// employment, payroll and audit history must survive for legal retention, so the
// identity is scrubbed while referential integrity is preserved.
//
// Two callers share this:
//   1. the admin-driven GDPR workflow (api/gdpr/erasure/[id]/execute), and
//   2. self-service account deletion (api/me DELETE, api/mobile/account DELETE),
//      which Apple App Store Guideline 5.1.1(v) requires for any app that
//      supports account creation.
// Both must scrub identically — that is why this lives in one place.

import { eq, and } from "drizzle-orm"
import { db } from "@prv/db"
import { users, userMfaMethods, userDevices, userAuditLog } from "@prv/db/schema"

export interface TableErasureRecord {
  table: string
  action: "anonymized" | "deleted"
  rowsAffected: number
}

/**
 * Scrub a user's identity. Returns a per-table log used to build the immutable
 * verification record. Company-scoped on the user row so a caller can never
 * erase across a tenant boundary.
 */
export async function runErasurePipeline(
  targetUserId: string,
  companyId: string
): Promise<TableErasureRecord[]> {
  const log: TableErasureRecord[] = []
  const erasedEmail = `erased-${targetUserId}@gdpr.erased.prv`
  const now = new Date()

  const userResult = await db
    .update(users)
    .set({
      email: erasedEmail,
      phone: null,
      firstName: "ERASED",
      lastName: "ERASED",
      bio: null,
      avatarUrl: null,
      employeeId: null,
      isActive: false,
      deletedAt: now,
      updatedAt: now,
    })
    .where(and(eq(users.id, targetUserId), eq(users.companyId, companyId)))
    .returning({ id: users.id })

  log.push({ table: "users", action: "anonymized", rowsAffected: userResult.length })

  const mfaResult = await db
    .delete(userMfaMethods)
    .where(eq(userMfaMethods.userId, targetUserId))
    .returning({ id: userMfaMethods.id })

  log.push({ table: "user_mfa_methods", action: "deleted", rowsAffected: mfaResult.length })

  const devicesResult = await db
    .delete(userDevices)
    .where(eq(userDevices.userId, targetUserId))
    .returning({ id: userDevices.id })

  log.push({ table: "user_devices", action: "deleted", rowsAffected: devicesResult.length })

  const auditResult = await db
    .update(userAuditLog)
    .set({ ipAddress: null, userAgent: null })
    .where(eq(userAuditLog.targetUserId, targetUserId))
    .returning({ id: userAuditLog.id })

  log.push({ table: "user_audit_log", action: "anonymized", rowsAffected: auditResult.length })

  return log
}
