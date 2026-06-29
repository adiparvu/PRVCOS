import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { and, eq, gte, isNull, sum } from "drizzle-orm"
import { db } from "@prv/db"
import { orders, alerts, stores } from "@prv/db/schema"
import type { GateContext } from "@prv/auth"
import { forecastTail, buildDonut, type DonutDatum } from "@/lib/metrics-helpers"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface AnalyticsChart {
  labels: string[]
  actual: number[]
  forecast: number[]
}

export interface AnalyticsMetrics {
  // Revenue trend per period selector, in € thousands (actual) with a short
  // linear forecast tail.
  chart: Record<string, AnalyticsChart>
  // Trailing 7-day sparklines for the headline stat cards.
  spark: {
    revenue: number[]
    avgOrder: number[]
    orders: number[]
    alerts: number[]
  }
  // Revenue breakdown by store over the trailing 90 days (top stores + Other).
  donut: DonutDatum[]
}

const DAY_MS = 86_400_000
const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function utcDayStart(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

// GET /api/intelligence/analytics-metrics — revenue trend (per period) and the
// trailing-week stat-card sparklines, all derived from real orders / alerts.
export const GET = withGates(
  { action: "intelligence.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const cid = ctx.session.companyId
    const now = new Date()
    const yearAgo = new Date(now.getTime() - 370 * DAY_MS)
    const weekAgo = new Date(utcDayStart(now) - 6 * DAY_MS)
    const ninetyAgo = new Date(now.getTime() - 90 * DAY_MS)

    const [orderRows, alertRows, storeRevRows] = await Promise.all([
      db
        .select({ total: orders.total, createdAt: orders.createdAt })
        .from(orders)
        .where(
          and(eq(orders.companyId, cid), gte(orders.createdAt, yearAgo), isNull(orders.deletedAt))
        ),
      db
        .select({ createdAt: alerts.createdAt })
        .from(alerts)
        .where(and(eq(alerts.companyId, cid), gte(alerts.createdAt, weekAgo))),
      db
        .select({ storeName: stores.name, revenue: sum(orders.total) })
        .from(orders)
        .leftJoin(stores, eq(orders.storeId, stores.id))
        .where(
          and(eq(orders.companyId, cid), gte(orders.createdAt, ninetyAgo), isNull(orders.deletedAt))
        )
        .groupBy(orders.storeId, stores.name),
    ])

    const events = orderRows.map((o) => ({ ts: o.createdAt.getTime(), total: Number(o.total) }))

    // Sum order revenue (€) whose timestamp falls in [from, to).
    const sumRange = (from: number, to: number) =>
      events.reduce((s, e) => (e.ts >= from && e.ts < to ? s + e.total : s), 0)
    const countRange = (from: number, to: number) =>
      events.reduce((c, e) => (e.ts >= from && e.ts < to ? c + 1 : c), 0)
    const toK = (eur: number) => Math.round(eur / 1000)

    const today = utcDayStart(now)

    // Daily buckets for the trailing 7 days (oldest → newest).
    const dailyRevenueK: number[] = []
    const dailyLabels: string[] = []
    for (let i = 6; i >= 0; i--) {
      const start = today - i * DAY_MS
      dailyRevenueK.push(toK(sumRange(start, start + DAY_MS)))
      dailyLabels.push(WEEKDAY[new Date(start).getUTCDay()] ?? "")
    }

    // Weekly buckets (W1 oldest) for the trailing `n` weeks.
    const weekly = (n: number): AnalyticsChart => {
      const actual: number[] = []
      const labels: string[] = []
      for (let i = n - 1; i >= 0; i--) {
        const start = today - (i * 7 + 6) * DAY_MS
        actual.push(toK(sumRange(start, start + 7 * DAY_MS)))
        labels.push(`W${n - i}`)
      }
      return { labels, actual, forecast: forecastTail(actual) }
    }

    // Monthly buckets for the trailing `n` calendar months.
    const monthly = (n: number): AnalyticsChart => {
      const actual: number[] = []
      const labels: string[] = []
      for (let i = n - 1; i >= 0; i--) {
        const from = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)
        const to = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1)
        actual.push(toK(sumRange(from, to)))
        labels.push(MONTH[new Date(from).getUTCMonth()] ?? "")
      }
      return { labels, actual, forecast: forecastTail(actual) }
    }

    const chart: Record<string, AnalyticsChart> = {
      "1w": { labels: dailyLabels, actual: dailyRevenueK, forecast: forecastTail(dailyRevenueK) },
      "1m": weekly(4),
      "3m": monthly(3),
      "6m": monthly(6),
      "1y": monthly(12),
    }

    // Trailing 7-day sparklines.
    const sparkRevenue: number[] = []
    const sparkAvgOrder: number[] = []
    const sparkOrders: number[] = []
    const sparkAlerts: number[] = []
    const alertTs = alertRows.map((a) => a.createdAt.getTime())
    for (let i = 6; i >= 0; i--) {
      const start = today - i * DAY_MS
      const end = start + DAY_MS
      const rev = sumRange(start, end)
      const cnt = countRange(start, end)
      sparkRevenue.push(Math.round(rev))
      sparkOrders.push(cnt)
      sparkAvgOrder.push(cnt > 0 ? Math.round(rev / cnt) : 0)
      sparkAlerts.push(alertTs.reduce((c, t) => (t >= start && t < end ? c + 1 : c), 0))
    }

    // Revenue breakdown by store (top 4 + Other) over the trailing 90 days.
    const donut: DonutDatum[] = buildDonut(storeRevRows)

    const metrics: AnalyticsMetrics = {
      chart,
      spark: {
        revenue: sparkRevenue,
        avgOrder: sparkAvgOrder,
        orders: sparkOrders,
        alerts: sparkAlerts,
      },
      donut,
    }

    return NextResponse.json(metrics)
  }
)
