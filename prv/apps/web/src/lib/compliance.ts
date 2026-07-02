// Compliance document expiry (roadmap 8.5). Pure + unit-tested. Reuses the
// day-diff from contract expiry so all HR expiry logic agrees.
import { daysUntil } from "./contract-expiry"

/** Days-before-expiry at which a document is flagged "expiring". */
export const COMPLIANCE_EXPIRY_WINDOW = 30

export type ComplianceBand = "expired" | "expiring" | "valid" | "none"

/**
 * Expiry band for a document: "expired" once past, "expiring" within
 * {@link COMPLIANCE_EXPIRY_WINDOW} days, "valid" beyond that, "none" when the
 * document never expires (no date).
 */
export function complianceBand(expiryDate: string | null, today: string): ComplianceBand {
  if (!expiryDate) return "none"
  const days = daysUntil(expiryDate, today)
  if (Number.isNaN(days)) return "none"
  if (days < 0) return "expired"
  if (days <= COMPLIANCE_EXPIRY_WINDOW) return "expiring"
  return "valid"
}

/**
 * A document is "compliant" when it is verified and not expired. Pending,
 * rejected or expired documents are non-compliant.
 */
export function isCompliant(status: string, band: ComplianceBand): boolean {
  return status === "verified" && band !== "expired"
}
