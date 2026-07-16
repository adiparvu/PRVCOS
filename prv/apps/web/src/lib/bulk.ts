/**
 * Shared helpers for the multi-select "bulk action" bars that sit on the
 * approval-queue list screens (time-off, purchase requests, expenses, …).
 *
 * Every bar fans a per-row request out with `Promise.all`, tags each result
 * as ok / not-ok, and then has to decide which toast to raise: a plain success
 * when everything went through, an error when nothing did, or a warning for a
 * partial failure. That branching used to be copy-pasted into each bar; this
 * module centralises it so the decision is defined — and tested — in one place.
 */

/** Outcome of a single item in a bulk fan-out. `ok` false counts as a failure. */
export interface BulkItemOutcome {
  ok: boolean
}

/** Which toast a bulk action should raise once every item has settled. */
export type BulkToastKind = "success" | "error" | "warning"

export interface BulkSummary {
  /** How many items succeeded. */
  ok: number
  /** How many items failed. */
  failed: number
  /** How many items were attempted in total. */
  total: number
  /**
   * `success` when nothing failed, `error` when nothing succeeded, and
   * `warning` for a partial failure (some ok, some failed).
   */
  kind: BulkToastKind
}

/**
 * Reduce the per-item outcomes of a bulk action into counts plus the toast
 * kind to show. An empty list is treated as a (vacuous) success — callers are
 * expected to short-circuit before dispatching when nothing is selected.
 */
export function summarizeBulk(outcomes: readonly BulkItemOutcome[]): BulkSummary {
  const ok = outcomes.reduce((n, o) => (o.ok ? n + 1 : n), 0)
  const failed = outcomes.length - ok
  const kind: BulkToastKind = failed === 0 ? "success" : ok === 0 ? "error" : "warning"
  return { ok, failed, total: outcomes.length, kind }
}

/**
 * Same as {@link summarizeBulk}, but for bars that fan out with
 * `Promise.allSettled` instead of tagging each result themselves. A
 * `fulfilled` result counts as a success and a `rejected` one as a failure.
 */
export function summarizeSettled(results: readonly PromiseSettledResult<unknown>[]): BulkSummary {
  return summarizeBulk(results.map((r) => ({ ok: r.status === "fulfilled" })))
}
