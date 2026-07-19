// Phase 18.2 — Inspection checklists (pure logic).
//
// A checklist is a list of weighted items (some critical, some requiring a photo).
// Execution answers each item pass/fail/na; the score is derived from the answers
// so it can never drift from the recorded results.

export const CHECKLIST_RESULTS = ["pass", "fail", "na"] as const
export type ChecklistResult = (typeof CHECKLIST_RESULTS)[number]

export interface ChecklistItem {
  label: string
  weight: number
  requirePhoto: boolean
  critical: boolean
}

function isResult(v: unknown): v is ChecklistResult {
  return typeof v === "string" && (CHECKLIST_RESULTS as readonly string[]).includes(v)
}

function normWeight(v: unknown): number {
  const n = typeof v === "number" ? v : parseInt(String(v), 10)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(100, Math.floor(n))
}

// Clean arbitrary template input into a valid item list. Items need a label; a bad
// weight falls back to 1; flags coerce to booleans. Untitled items are dropped.
export function normalizeChecklistItems(raw: unknown): ChecklistItem[] {
  if (!Array.isArray(raw)) return []
  const out: ChecklistItem[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue
    const e = entry as Record<string, unknown>
    const label = typeof e["label"] === "string" ? e["label"].trim().slice(0, 500) : ""
    if (!label) continue
    out.push({
      label,
      weight: normWeight(e["weight"]),
      requirePhoto: e["requirePhoto"] === true,
      critical: e["critical"] === true,
    })
  }
  return out
}

export interface ScoredResult {
  weight: number
  critical: boolean
  result: ChecklistResult
}

export interface InspectionScore {
  score: number
  maxScore: number
  passRate: number // 0..100 integer
  failedItems: number
  failedCritical: boolean
}

// Score from executed answers: na items are excluded from the denominator, passes
// earn their weight. A failed critical item is surfaced so callers can flag it.
export function computeInspectionScore(results: ScoredResult[]): InspectionScore {
  let score = 0
  let maxScore = 0
  let failedItems = 0
  let failedCritical = false
  for (const r of results) {
    if (r.result === "na") continue
    maxScore += r.weight
    if (r.result === "pass") score += r.weight
    else {
      failedItems++
      if (r.critical) failedCritical = true
    }
  }
  const passRate = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  return { score, maxScore, passRate, failedItems, failedCritical }
}

// Validate a submitted answer set against required-photo rules. Returns the labels
// of failed items missing their mandatory photo so the API can reject cleanly.
export function missingRequiredPhotos(
  answers: {
    requirePhoto: boolean
    result: ChecklistResult
    photoUrl: string | null
    label: string
  }[]
): string[] {
  return answers
    .filter((a) => a.requirePhoto && a.result === "fail" && !a.photoUrl)
    .map((a) => a.label)
}

export { isResult as isChecklistResult }
