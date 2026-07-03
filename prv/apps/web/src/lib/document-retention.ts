// Document retention & expiry intelligence (Phase 12.5). Pure + unit-tested.
//
// Given a document's dates + type and the company's retention policy, derives an
// effective expiry, a retention band, and eligibility for auto-archive and GDPR
// erasure. A legal hold overrides everything — a held document is never archived
// or erased regardless of expiry.

export type DocumentType =
  | "contract"
  | "report"
  | "photo"
  | "certificate"
  | "invoice_doc"
  | "permit"
  | "specification"
  | "other"

export type RetentionBand = "on_hold" | "expired" | "approaching_14" | "approaching_30" | "active"

// Statutory-ish defaults (months) matching the roadmap retention table.
export const DEFAULT_RETENTION_MONTHS: Record<DocumentType, number> = {
  contract: 84, // 7 years
  invoice_doc: 84, // 7 years (tax)
  certificate: 120, // 10 years (safety-adjacent)
  permit: 84,
  report: 60, // 5 years
  specification: 60,
  photo: 36, // 3 years
  other: 36,
}

export interface RetentionPolicyLike {
  retentionMonths: number
  autoArchive: boolean
}

export interface DocumentLike {
  type: DocumentType
  createdAt: string // ISO
  expiresAt: string | null // ISO; explicit expiry overrides the policy-derived one
  status: string // draft/published/.../archived
  legalHold: boolean
}

export interface RetentionResult {
  band: RetentionBand
  effectiveExpiry: string // ISO date (YYYY-MM-DD)
  daysUntilExpiry: number // negative once past
  autoArchiveEligible: boolean
  gdprEraseEligible: boolean
}

function addMonthsISO(iso: string, months: number): string {
  const d = new Date(iso)
  const base = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate())
  return new Date(base).toISOString().slice(0, 10)
}

/** Resolve the retention months for a document type from a policy or the defaults. */
export function retentionMonthsFor(
  type: DocumentType,
  policy: RetentionPolicyLike | undefined
): number {
  if (policy && Number.isFinite(policy.retentionMonths) && policy.retentionMonths > 0) {
    return policy.retentionMonths
  }
  return DEFAULT_RETENTION_MONTHS[type] ?? 36
}

/**
 * Compute the retention outcome for a single document at `nowMs`.
 * `policy` is the company's policy for the document's type (optional → defaults).
 */
export function evaluateRetention(
  doc: DocumentLike,
  policy: RetentionPolicyLike | undefined,
  nowMs: number
): RetentionResult {
  const months = retentionMonthsFor(doc.type, policy)
  const effectiveExpiry = doc.expiresAt
    ? doc.expiresAt.slice(0, 10)
    : addMonthsISO(doc.createdAt, months)

  const expiryMs = Date.parse(effectiveExpiry + "T00:00:00Z")
  const dayStart = new Date(nowMs).setUTCHours(0, 0, 0, 0)
  const daysUntilExpiry = Number.isFinite(expiryMs)
    ? Math.round((expiryMs - dayStart) / 86_400_000)
    : 0

  let band: RetentionBand
  if (doc.legalHold) band = "on_hold"
  else if (daysUntilExpiry < 0) band = "expired"
  else if (daysUntilExpiry <= 14) band = "approaching_14"
  else if (daysUntilExpiry <= 30) band = "approaching_30"
  else band = "active"

  const expired = !doc.legalHold && daysUntilExpiry < 0
  const alreadyArchived = doc.status === "archived"
  const autoArchiveEligible = expired && !alreadyArchived && !!policy?.autoArchive
  const gdprEraseEligible = expired && !doc.legalHold

  return { band, effectiveExpiry, daysUntilExpiry, autoArchiveEligible, gdprEraseEligible }
}

export interface RetentionSummary {
  total: number
  onHold: number
  expired: number
  approaching: number // ≤30 days, not expired, not held
  autoArchiveEligible: number
}

export function summarizeRetention(results: RetentionResult[]): RetentionSummary {
  let onHold = 0
  let expired = 0
  let approaching = 0
  let autoArchiveEligible = 0
  for (const r of results) {
    if (r.band === "on_hold") onHold += 1
    else if (r.band === "expired") expired += 1
    else if (r.band === "approaching_14" || r.band === "approaching_30") approaching += 1
    if (r.autoArchiveEligible) autoArchiveEligible += 1
  }
  return { total: results.length, onHold, expired, approaching, autoArchiveEligible }
}
