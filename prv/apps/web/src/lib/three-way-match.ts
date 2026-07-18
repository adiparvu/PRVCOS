/**
 * Pure logic for the procurement 3-way match (Phase 21.4).
 *
 * A supplier invoice is only safe to pay once it agrees with what was ordered
 * (the purchase order) and what actually arrived (the goods-receipt note). This
 * reconciles the three:
 *
 *   • quantity  — did the receipt satisfy the ordered lines, with nothing
 *                 rejected or damaged? (derived upstream from the GRN)
 *   • price     — is the invoiced amount within tolerance of the value of the
 *                 goods actually received, Σ(receivedQty × unitPrice)?
 *
 * The route assembles the three documents and calls in here; keeping the
 * decision pure means the tolerance behaviour is unit-tested in one place.
 */

export type ThreeWayMatchStatus =
  | "unmatched"
  | "matched"
  | "price_variance"
  | "quantity_variance"
  | "discrepancy"

/** Default allowed price variance: 2%. Callers may override per match. */
export const DEFAULT_PRICE_TOLERANCE = 0.02

export interface ThreeWayMatchInput {
  /** Value of the goods actually received: Σ(receivedQty × unitPrice), pre-tax. */
  expectedValue: number
  /** Net (pre-tax) amount billed on the supplier invoice. */
  invoiceAmount: number
  /** Whether the receipt fully satisfied the ordered quantities. */
  quantityFullyReceived: boolean
  /** Whether the receipt flagged any rejected or damaged goods. */
  hasRejectedOrDamaged: boolean
  /** Allowed price variance as a fraction of the expected value (e.g. 0.02 = 2%). */
  tolerance: number
}

export interface ThreeWayMatchResult {
  status: ThreeWayMatchStatus
  /** Signed currency difference, invoice − expected (positive = over-billed). */
  priceVariance: number
  /** |difference| / expected, as a fraction. */
  priceVariancePct: number
  /** Whether the price variance is within the supplied tolerance. */
  withinTolerance: boolean
}

const round2 = (n: number): number => Math.round(n * 100) / 100
const round4 = (n: number): number => Math.round(n * 10_000) / 10_000

/**
 * Price variance as a fraction of the expected value. When nothing was expected,
 * a zero invoice is a perfect match (0) and any non-zero invoice is fully off (1).
 */
export function priceVariancePct(expectedValue: number, invoiceAmount: number): number {
  if (expectedValue === 0) return invoiceAmount === 0 ? 0 : 1
  return Math.abs(invoiceAmount - expectedValue) / Math.abs(expectedValue)
}

/** Reconcile the price and quantity legs into a single match status. */
export function evaluateThreeWayMatch(input: ThreeWayMatchInput): ThreeWayMatchResult {
  const pct = priceVariancePct(input.expectedValue, input.invoiceAmount)
  const withinTolerance = pct <= input.tolerance
  const priceVariance = round2(input.invoiceAmount - input.expectedValue)

  let status: ThreeWayMatchStatus
  if (input.hasRejectedOrDamaged) {
    // Rejected/damaged goods always need a human — never auto-matched.
    status = "discrepancy"
  } else if (input.quantityFullyReceived && withinTolerance) {
    status = "matched"
  } else if (!input.quantityFullyReceived && withinTolerance) {
    status = "quantity_variance"
  } else if (input.quantityFullyReceived && !withinTolerance) {
    status = "price_variance"
  } else {
    status = "discrepancy"
  }

  return { status, priceVariance, priceVariancePct: round4(pct), withinTolerance }
}
