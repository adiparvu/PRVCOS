// Accounts Payable aging + cash-outflow helpers (roadmap 11.6). Pure + tested.

export type PayableStatus = "received" | "scheduled" | "paid" | "cancelled"

export interface PayableLike {
  status: PayableStatus
  dueDate: string // ISO date (YYYY-MM-DD)
  amount: number
  taxAmount: number
  paidAmount: number
}

/** Outstanding = gross (amount + tax) − paid, never negative. */
export function outstanding(p: { amount: number; taxAmount: number; paidAmount: number }): number {
  const gross = Math.max(0, p.amount) + Math.max(0, p.taxAmount)
  return Math.max(0, Math.round((gross - Math.max(0, p.paidAmount)) * 100) / 100)
}

/** A payable is "open" if it still owes money and isn't cancelled/paid. */
export function isOpenPayable(p: PayableLike): boolean {
  if (p.status === "cancelled" || p.status === "paid") return false
  return outstanding(p) > 0
}

function dayDiff(fromISO: string, nowMs: number): number {
  const due = Date.parse(fromISO + "T00:00:00Z")
  if (!Number.isFinite(due)) return 0
  // positive = overdue by N days
  return Math.floor((nowMs - due) / 86_400_000)
}

export interface AgingBucket {
  key: "current" | "1-30" | "31-60" | "61-90" | "90+"
  label: string
  count: number
  total: number
}

export interface AgingReport {
  buckets: AgingBucket[]
  totalOutstanding: number
  overdueTotal: number
  openCount: number
}

const BUCKET_DEFS: { key: AgingBucket["key"]; label: string }[] = [
  { key: "current", label: "Not yet due" },
  { key: "1-30", label: "1–30 days" },
  { key: "31-60", label: "31–60 days" },
  { key: "61-90", label: "61–90 days" },
  { key: "90+", label: "90+ days" },
]

function bucketFor(daysOverdue: number): AgingBucket["key"] {
  if (daysOverdue <= 0) return "current"
  if (daysOverdue <= 30) return "1-30"
  if (daysOverdue <= 60) return "31-60"
  if (daysOverdue <= 90) return "61-90"
  return "90+"
}

/** Bucket open payables by how overdue they are (relative to `nowMs`). */
export function agePayables(items: PayableLike[], nowMs: number): AgingReport {
  const buckets: AgingBucket[] = BUCKET_DEFS.map((d) => ({ ...d, count: 0, total: 0 }))
  const byKey = new Map(buckets.map((b) => [b.key, b]))
  let totalOutstanding = 0
  let overdueTotal = 0
  let openCount = 0

  for (const p of items) {
    if (!isOpenPayable(p)) continue
    const owed = outstanding(p)
    const daysOverdue = dayDiff(p.dueDate, nowMs)
    const bucket = byKey.get(bucketFor(daysOverdue))!
    bucket.count += 1
    bucket.total = Math.round((bucket.total + owed) * 100) / 100
    totalOutstanding = Math.round((totalOutstanding + owed) * 100) / 100
    if (daysOverdue > 0) overdueTotal = Math.round((overdueTotal + owed) * 100) / 100
    openCount += 1
  }

  return { buckets, totalOutstanding, overdueTotal, openCount }
}

export interface OutflowDay {
  date: string // ISO date
  count: number
  total: number
}

/**
 * Upcoming cash outflow: open payables grouped by their scheduled date (falling
 * back to due date), within the next `days` window from `nowMs`, ascending.
 * Already-overdue open payables collapse onto the current day so they surface.
 */
export function outflowCalendar(
  items: (PayableLike & { scheduledDate?: string | null })[],
  nowMs: number,
  days = 30
): OutflowDay[] {
  const todayISO = new Date(nowMs).toISOString().slice(0, 10)
  const horizon = nowMs + days * 86_400_000
  const byDate = new Map<string, OutflowDay>()

  for (const p of items) {
    if (!isOpenPayable(p)) continue
    const target = p.scheduledDate || p.dueDate
    const targetMs = Date.parse(target + "T00:00:00Z")
    if (!Number.isFinite(targetMs)) continue
    // Bring overdue items forward to today so they aren't hidden in the past.
    const dateISO = targetMs < nowMs ? todayISO : target
    if (Date.parse(dateISO + "T00:00:00Z") > horizon) continue
    const owed = outstanding(p)
    const entry = byDate.get(dateISO) ?? { date: dateISO, count: 0, total: 0 }
    entry.count += 1
    entry.total = Math.round((entry.total + owed) * 100) / 100
    byDate.set(dateISO, entry)
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}
