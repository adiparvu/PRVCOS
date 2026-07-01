// Earned Value Analysis (roadmap 6.4).
//
// Pure, dependency-free EVA math so it can be unit-tested in isolation and
// reused by the budget endpoint. All money values are plain numbers (EUR);
// callers round for display. Division guards return null for undefined ratios
// (e.g. CPI when nothing has been spent yet) rather than Infinity/NaN.

export type BudgetHealthBand = "green" | "amber" | "red"

export interface EvaInput {
  /** Budget at Completion — total planned budget (Σ planned per category). */
  bac: number
  /** Actual Cost — costs incurred to date (Σ actual per category). */
  ac: number
  /** Committed cost — approved POs/contracts not yet paid. */
  committed: number
  /** Physical progress, 0..1 (e.g. milestones completed / total). */
  percentComplete: number
  /** Elapsed schedule fraction, 0..1 (time gone of planned duration). */
  scheduleFraction: number
  /** Weeks elapsed since start, for burn rate. 0 → burn rate null. */
  elapsedWeeks: number
}

export interface EvaResult {
  bac: number
  ac: number
  committed: number
  /** Earned Value = BAC × %complete. */
  ev: number
  /** Planned Value = BAC × schedule fraction. */
  pv: number
  /** Cost Variance = EV − AC (positive = under budget). */
  costVariance: number
  /** Schedule Variance = EV − PV (positive = ahead). */
  scheduleVariance: number
  /** Cost Performance Index = EV / AC. null when AC = 0. */
  cpi: number | null
  /** Schedule Performance Index = EV / PV. null when PV = 0. */
  spi: number | null
  /** Estimate to Complete = (BAC − EV) / CPI. */
  etc: number
  /** Estimate at Completion = AC + ETC. */
  eac: number
  /** Variance at Completion = BAC − EAC (positive = projected saving). */
  vac: number
  /** Average spend per week. null when no time elapsed. */
  burnRate: number | null
  /** Forecast overrun signal: green < 90% of BAC, amber 90–100%, red > 100%. */
  healthBand: BudgetHealthBand
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function computeEva(input: EvaInput): EvaResult {
  const bac = Math.max(0, input.bac)
  const ac = Math.max(0, input.ac)
  const committed = Math.max(0, input.committed)
  const pct = clamp01(input.percentComplete)
  const sched = clamp01(input.scheduleFraction)

  const ev = bac * pct
  const pv = bac * sched

  const cpi = ac > 0 ? ev / ac : null
  const spi = pv > 0 ? ev / pv : null

  // ETC assumes remaining work runs at the current cost efficiency; when CPI is
  // unknown (nothing spent yet) fall back to the raw remaining budget.
  const etc = cpi && cpi > 0 ? (bac - ev) / cpi : bac - ev
  const eac = ac + etc
  const vac = bac - eac

  const eacRatio = bac > 0 ? eac / bac : 0
  const healthBand: BudgetHealthBand = eacRatio > 1.0 ? "red" : eacRatio >= 0.9 ? "amber" : "green"

  return {
    bac: round2(bac),
    ac: round2(ac),
    committed: round2(committed),
    ev: round2(ev),
    pv: round2(pv),
    costVariance: round2(ev - ac),
    scheduleVariance: round2(ev - pv),
    cpi: cpi === null ? null : round2(cpi),
    spi: spi === null ? null : round2(spi),
    etc: round2(etc),
    eac: round2(eac),
    vac: round2(vac),
    burnRate: input.elapsedWeeks > 0 ? round2(ac / input.elapsedWeeks) : null,
    healthBand,
  }
}
