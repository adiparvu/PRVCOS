// Document retention auto-archive rule (Phase 12.5) — pure + unit-tested.
//
// Mirrors the archive decision in apps/web/src/lib/document-retention.ts
// (evaluateRetention.autoArchiveEligible), extracted here so the retention cron
// in @prv/jobs can share the exact same logic across the package boundary.
//
// A document is DUE for auto-archive when: it is not on legal hold, it is not
// already archived, and its effective expiry date is strictly before today
// (UTC, date-level — matching the dashboard's daysUntilExpiry < 0). The caller
// applies this only for document types whose company policy has autoArchive on.

export interface RetentionArchiveDoc {
  createdAt: Date
  expiresAt: Date | null
  status: string
  legalHold: boolean
}

/** Effective expiry as a YYYY-MM-DD string: explicit expiresAt, else createdAt + months. */
export function effectiveExpiryISO(
  createdAt: Date,
  expiresAt: Date | null,
  retentionMonths: number
): string {
  if (expiresAt) return expiresAt.toISOString().slice(0, 10)
  const base = Date.UTC(
    createdAt.getUTCFullYear(),
    createdAt.getUTCMonth() + retentionMonths,
    createdAt.getUTCDate()
  )
  return new Date(base).toISOString().slice(0, 10)
}

/** Whole days from today's UTC start to the effective expiry (negative once past). */
export function daysUntilExpiry(
  doc: RetentionArchiveDoc,
  retentionMonths: number,
  now: Date
): number {
  const expiry = effectiveExpiryISO(doc.createdAt, doc.expiresAt, retentionMonths)
  const expiryMs = Date.parse(expiry + "T00:00:00Z")
  const dayStart = new Date(now.getTime()).setUTCHours(0, 0, 0, 0)
  return Number.isFinite(expiryMs) ? Math.round((expiryMs - dayStart) / 86_400_000) : 0
}

export function isRetentionArchiveDue(
  doc: RetentionArchiveDoc,
  retentionMonths: number,
  now: Date
): boolean {
  if (doc.legalHold) return false
  if (doc.status === "archived") return false
  return daysUntilExpiry(doc, retentionMonths, now) < 0
}
