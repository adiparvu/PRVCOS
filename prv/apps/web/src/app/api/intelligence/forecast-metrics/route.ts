import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { and, eq, gte, lt, isNull, sum, count } from "drizzle-orm"
import { db } from "@prv/db"
import { orders, clients, expenses } from "@prv/db/schema"
import type { GateContext } from "@prv/auth"
import { trendOf, eurK } from "@/lib/metrics-helpers"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface ForecastMetric {
  label: string
  value: string
  trend: string
  trendDir: "up" | "down" | "flat"
  pct: number
}

// GET /api/intelligence/forecast-metrics — month-over-month projection of the
// headline business KPIs, derived from real orders / clients / expenses.
export const GET = withGates(
  { action: "intelligence.forecast.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const cid = ctx.session.companyId
    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
    const monthStartStr = monthStart.toISOString().slice(0, 10)
    const lastMonthStartStr = lastMonthStart.toISOString().slice(0, 10)
    const ninetyAgo = new Date(now.getTime() - 90 * 86_400_000)

    const num = (rows: { v: number | string | null }[]) => Number(rows[0]?.v ?? 0)

    const [
      revThis,
      revLast,
      ordThis,
      ordLast,
      cliThis,
      cliLast,
      expThis,
      expLast,
      recentOrderClients,
      activeClients,
    ] = await Promise.all([
      db
        .select({ v: sum(orders.total) })
        .from(orders)
        .where(
          and(
            eq(orders.companyId, cid),
            gte(orders.createdAt, monthStart),
            isNull(orders.deletedAt)
          )
        ),
      db
        .select({ v: sum(orders.total) })
        .from(orders)
        .where(
          and(
            eq(orders.companyId, cid),
            gte(orders.createdAt, lastMonthStart),
            lt(orders.createdAt, monthStart),
            isNull(orders.deletedAt)
          )
        ),
      db
        .select({ v: count() })
        .from(orders)
        .where(
          and(
            eq(orders.companyId, cid),
            gte(orders.createdAt, monthStart),
            isNull(orders.deletedAt)
          )
        ),
      db
        .select({ v: count() })
        .from(orders)
        .where(
          and(
            eq(orders.companyId, cid),
            gte(orders.createdAt, lastMonthStart),
            lt(orders.createdAt, monthStart),
            isNull(orders.deletedAt)
          )
        ),
      db
        .select({ v: count() })
        .from(clients)
        .where(
          and(
            eq(clients.companyId, cid),
            gte(clients.createdAt, monthStart),
            isNull(clients.deletedAt)
          )
        ),
      db
        .select({ v: count() })
        .from(clients)
        .where(
          and(
            eq(clients.companyId, cid),
            gte(clients.createdAt, lastMonthStart),
            lt(clients.createdAt, monthStart),
            isNull(clients.deletedAt)
          )
        ),
      db
        .select({ v: sum(expenses.amount) })
        .from(expenses)
        .where(
          and(
            eq(expenses.companyId, cid),
            gte(expenses.date, monthStartStr),
            isNull(expenses.deletedAt)
          )
        ),
      db
        .select({ v: sum(expenses.amount) })
        .from(expenses)
        .where(
          and(
            eq(expenses.companyId, cid),
            gte(expenses.date, lastMonthStartStr),
            lt(expenses.date, monthStartStr),
            isNull(expenses.deletedAt)
          )
        ),
      db
        .selectDistinct({ clientId: orders.clientId })
        .from(orders)
        .where(
          and(eq(orders.companyId, cid), gte(orders.createdAt, ninetyAgo), isNull(orders.deletedAt))
        ),
      db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(eq(clients.companyId, cid), eq(clients.isActive, true), isNull(clients.deletedAt))
        ),
    ])

    // Churn risk: active clients with no order in the last 90 days.
    const recentIds = new Set(recentOrderClients.map((r) => r.clientId).filter(Boolean) as string[])
    const churnCount = activeClients.filter((c) => !recentIds.has(c.id)).length
    const churnPct =
      activeClients.length > 0 ? Math.round((churnCount / activeClients.length) * 100) : 0

    const revenue = trendOf(num(revThis), num(revLast))
    const ordersT = trendOf(num(ordThis), num(ordLast))
    const newClients = trendOf(num(cliThis), num(cliLast))
    const expensesT = trendOf(num(expThis), num(expLast))

    const metrics: ForecastMetric[] = [
      {
        label: "Revenue",
        value: eurK(num(revThis)),
        trend: revenue.trend,
        trendDir: revenue.dir,
        pct: revenue.pct,
      },
      {
        label: "Orders",
        value: num(ordThis).toLocaleString("en-US"),
        trend: ordersT.trend,
        trendDir: ordersT.dir,
        pct: ordersT.pct,
      },
      {
        label: "New Clients",
        value: String(num(cliThis)),
        trend: newClients.trend,
        trendDir: newClients.dir,
        pct: newClients.pct,
      },
      {
        label: "Churn Risk",
        value: String(churnCount),
        trend: `${churnCount} at risk`,
        trendDir: churnCount > 0 ? "down" : "flat",
        pct: churnPct,
      },
      {
        label: "Expenses",
        value: eurK(num(expThis)),
        trend: expensesT.trend,
        trendDir: expensesT.dir,
        pct: expensesT.pct,
      },
    ]

    return NextResponse.json({ metrics })
  }
)
