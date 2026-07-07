// Order analytics — Shop fulfillment (roadmap Phase 9). Pure + unit-tested.
//
// Rolls the order ledger into volume, booked revenue and average order value,
// the status mix across the fulfillment lifecycle, fulfilled vs cancel/refund
// rates, and a trailing monthly revenue trend. Cancelled and refunded orders
// are excluded from booked revenue — that money is not realised.

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"

export interface OrderInput {
  status: OrderStatus
  total: number
  createdAt: string // ISO
}

export interface OrderMonthBucket {
  month: string // YYYY-MM
  label: string
  revenue: number
}

export interface OrderAnalytics {
  totalOrders: number
  revenue: number // booked = not cancelled/refunded
  aov: number // revenue / booked orders
  delivered: number
  cancelledOrRefunded: number
  fulfilledRatePct: number | null // delivered / total
  cancelRatePct: number | null // (cancelled + refunded) / total
  byStatus: Record<OrderStatus, number>
  months: OrderMonthBucket[] // oldest → newest
  momChangePct: number | null
}

const LOST = new Set<OrderStatus>(["cancelled", "refunded"])
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function money(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100
}
function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Aggregate orders into fulfillment + revenue analytics as of `nowMs`. */
export function computeOrderAnalytics(
  orders: OrderInput[],
  nowMs: number,
  monthsBack = 6
): OrderAnalytics {
  const byStatus: Record<OrderStatus, number> = {
    pending: 0,
    confirmed: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    refunded: 0,
  }

  const now = new Date(nowMs)
  const span = Math.max(1, Math.floor(monthsBack))
  const months: OrderMonthBucket[] = []
  const monthIndex = new Map<string, number>()
  for (let i = span - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    monthIndex.set(key, months.length)
    months.push({ month: key, label: MONTHS[d.getUTCMonth()]!, revenue: 0 })
  }

  let revenue = 0
  let bookedOrders = 0

  for (const o of orders) {
    if (o.status in byStatus) byStatus[o.status] += 1
    const amt = Math.max(0, money(o.total))
    if (!LOST.has(o.status)) {
      revenue += amt
      bookedOrders += 1
      const ts = Date.parse(o.createdAt)
      if (Number.isFinite(ts)) {
        const d = new Date(ts)
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
        const idx = monthIndex.get(key)
        if (idx !== undefined) months[idx]!.revenue += amt
      }
    }
  }

  for (const m of months) m.revenue = money(m.revenue)

  const totalOrders = orders.length
  const delivered = byStatus.delivered
  const cancelledOrRefunded = byStatus.cancelled + byStatus.refunded

  let momChangePct: number | null = null
  if (months.length >= 2) {
    const prev = months[months.length - 2]!.revenue
    const curr = months[months.length - 1]!.revenue
    if (prev > 0) momChangePct = round1(((curr - prev) / prev) * 100)
  }

  return {
    totalOrders,
    revenue: money(revenue),
    aov: bookedOrders > 0 ? money(revenue / bookedOrders) : 0,
    delivered,
    cancelledOrRefunded,
    fulfilledRatePct: totalOrders > 0 ? round1((delivered / totalOrders) * 100) : null,
    cancelRatePct: totalOrders > 0 ? round1((cancelledOrRefunded / totalOrders) * 100) : null,
    byStatus,
    months,
    momChangePct,
  }
}
