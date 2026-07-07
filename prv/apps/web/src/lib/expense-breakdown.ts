// Expense breakdown — Finance analytics (roadmap Phase 11). Pure + unit-tested.
//
// Rolls the expense ledger into committed spend (approved + paid), the paid vs
// pending split, a per-category breakdown, and a trailing monthly trend so a
// finance lead sees where the money goes and whether it is climbing. Draft and
// rejected expenses are excluded from spend — they are not commitments.

export type ExpenseStatus = "draft" | "submitted" | "approved" | "rejected" | "paid"

export interface ExpenseInput {
  category: string
  status: ExpenseStatus
  amount: number
  date: string // YYYY-MM-DD or ISO
}

export interface CategoryBucket {
  category: string
  amount: number
}

export interface ExpenseMonthBucket {
  month: string // YYYY-MM
  label: string // e.g. "Jul"
  amount: number
}

export interface ExpenseBreakdown {
  totalSpend: number // committed = approved + paid
  paidAmount: number
  pendingAmount: number // submitted, awaiting approval
  committedCount: number
  byCategory: CategoryBucket[] // largest first
  months: ExpenseMonthBucket[] // oldest → newest
  momChangePct: number | null
}

// Statuses that represent committed spend.
const COMMITTED = new Set<ExpenseStatus>(["approved", "paid"])
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function money(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100
}
function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/**
 * Build the expense breakdown as of `nowMs` over `monthsBack` trailing months.
 * Spend counts committed (approved + paid) expenses only.
 */
export function computeExpenseBreakdown(
  expenses: ExpenseInput[],
  nowMs: number,
  monthsBack = 6
): ExpenseBreakdown {
  const span = Math.max(1, Math.floor(monthsBack))
  const now = new Date(nowMs)
  const baseYear = now.getUTCFullYear()
  const baseMonth = now.getUTCMonth()

  const months: ExpenseMonthBucket[] = []
  const monthIndex = new Map<string, number>()
  for (let i = span - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(baseYear, baseMonth - i, 1))
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    monthIndex.set(key, months.length)
    months.push({ month: key, label: MONTHS[d.getUTCMonth()]!, amount: 0 })
  }

  const catMap = new Map<string, number>()
  let totalSpend = 0
  let paidAmount = 0
  let pendingAmount = 0
  let committedCount = 0

  for (const e of expenses) {
    const amt = Math.max(0, money(e.amount))
    if (e.status === "submitted") pendingAmount += amt
    if (e.status === "paid") paidAmount += amt
    if (!COMMITTED.has(e.status)) continue

    totalSpend += amt
    committedCount += 1
    catMap.set(e.category, (catMap.get(e.category) ?? 0) + amt)

    const ts = Date.parse(e.date)
    if (Number.isFinite(ts)) {
      const d = new Date(ts)
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
      const idx = monthIndex.get(key)
      if (idx !== undefined) months[idx]!.amount += amt
    }
  }

  const byCategory: CategoryBucket[] = [...catMap.entries()]
    .map(([category, amount]) => ({ category, amount: money(amount) }))
    .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category))

  for (const m of months) m.amount = money(m.amount)

  let momChangePct: number | null = null
  if (months.length >= 2) {
    const prev = months[months.length - 2]!.amount
    const curr = months[months.length - 1]!.amount
    if (prev > 0) momChangePct = round1(((curr - prev) / prev) * 100)
  }

  return {
    totalSpend: money(totalSpend),
    paidAmount: money(paidAmount),
    pendingAmount: money(pendingAmount),
    committedCount,
    byCategory,
    months,
    momChangePct,
  }
}
