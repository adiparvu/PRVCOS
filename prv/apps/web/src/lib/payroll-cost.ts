// Payroll cost analytics — Workforce / Finance (roadmap Phase 8.2). Pure +
// unit-tested.
//
// Rolls payroll runs up into total gross and net cost, the deduction load, the
// average cost per employee-payslip, a per-type breakdown (weekly / monthly /
// special), the run status mix, and a monthly gross-cost trend.

export type PayrollStatus = "processing" | "done" | "pending"
export type PayrollType = "weekly" | "monthly" | "special"

export interface PayrollRunInput {
  type: PayrollType
  status: PayrollStatus
  totalGross: number
  netPaid: number
  employeeCount: number
  periodEnd: string // YYYY-MM-DD
}

export interface TypeBucket {
  type: string
  gross: number
  runs: number
}

export interface PayrollMonthBucket {
  month: string // YYYY-MM
  label: string
  gross: number
}

export interface PayrollCost {
  runs: number
  totalGross: number
  totalNet: number
  deductions: number // gross − net
  employeeSlots: number // sum of employee counts across runs (payslips)
  avgCostPerEmployee: number // gross / employeeSlots
  byType: TypeBucket[] // largest gross first
  byStatus: Record<PayrollStatus, number>
  months: PayrollMonthBucket[] // oldest → newest
  momChangePct: number | null
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function money(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100
}
function round1(n: number): number {
  return Math.round(n * 10) / 10
}
function nonNeg(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Aggregate payroll runs into a cost view as of `nowMs`. */
export function computePayrollCost(
  runs: PayrollRunInput[],
  nowMs: number,
  monthsBack = 6
): PayrollCost {
  const byStatus: Record<PayrollStatus, number> = { processing: 0, done: 0, pending: 0 }
  const typeMap = new Map<string, { gross: number; runs: number }>()

  const now = new Date(nowMs)
  const span = Math.max(1, Math.floor(monthsBack))
  const months: PayrollMonthBucket[] = []
  const monthIndex = new Map<string, number>()
  for (let i = span - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    monthIndex.set(key, months.length)
    months.push({ month: key, label: MONTHS[d.getUTCMonth()]!, gross: 0 })
  }

  let totalGross = 0
  let totalNet = 0
  let employeeSlots = 0

  for (const r of runs) {
    const gross = nonNeg(money(r.totalGross))
    const net = nonNeg(money(r.netPaid))
    totalGross += gross
    totalNet += net
    employeeSlots += Math.max(0, Math.floor(r.employeeCount))
    if (r.status in byStatus) byStatus[r.status] += 1

    const t = typeMap.get(r.type) ?? { gross: 0, runs: 0 }
    t.gross += gross
    t.runs += 1
    typeMap.set(r.type, t)

    // Bucket by the pay-period end month.
    const ts = Date.parse(r.periodEnd)
    if (Number.isFinite(ts)) {
      const d = new Date(ts)
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
      const idx = monthIndex.get(key)
      if (idx !== undefined) months[idx]!.gross += gross
    }
  }

  for (const m of months) m.gross = money(m.gross)

  const byType: TypeBucket[] = [...typeMap.entries()]
    .map(([type, v]) => ({ type, gross: money(v.gross), runs: v.runs }))
    .sort((a, b) => b.gross - a.gross || a.type.localeCompare(b.type))

  let momChangePct: number | null = null
  if (months.length >= 2) {
    const prev = months[months.length - 2]!.gross
    const curr = months[months.length - 1]!.gross
    if (prev > 0) momChangePct = round1(((curr - prev) / prev) * 100)
  }

  return {
    runs: runs.length,
    totalGross: money(totalGross),
    totalNet: money(totalNet),
    deductions: money(totalGross - totalNet),
    employeeSlots,
    avgCostPerEmployee: employeeSlots > 0 ? money(totalGross / employeeSlots) : 0,
    byType,
    byStatus,
    months,
    momChangePct,
  }
}
