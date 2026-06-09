import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { invoices, expenses } from "@prv/db/schema"
import { and, eq, gte, isNull, lt, inArray } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface ChartResponse {
  labels: string[]
  revenue: number[]
  expenses: number[]
}

type Period = "1w" | "1m" | "3m" | "6m" | "1y"

interface Bucket {
  label: string
  startStr: string
  endStr: string
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const
const ACTIVE_STATUSES = ["approved", "paid"] as const

function ds(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function startOfMonth(y: number, m: number): Date {
  return new Date(Date.UTC(y, m, 1))
}

function buildBuckets(period: Period): Bucket[] {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()

  if (period === "1w") {
    const dow = now.getUTCDay()
    const monday = new Date(now)
    monday.setUTCDate(now.getUTCDate() - ((dow + 6) % 7))
    monday.setUTCHours(0, 0, 0, 0)
    return DAY_NAMES.map((label, i) => {
      const start = new Date(monday)
      start.setUTCDate(monday.getUTCDate() + i)
      const end = new Date(start)
      end.setUTCDate(start.getUTCDate() + 1)
      return { label, startStr: ds(start), endStr: ds(end) }
    })
  }

  if (period === "1m") {
    const monthStart = startOfMonth(y, m)
    const monthEnd = startOfMonth(y, m + 1)
    const buckets: Bucket[] = []
    let ptr = new Date(monthStart)
    let week = 1
    while (ptr < monthEnd) {
      const start = new Date(ptr)
      const end = new Date(ptr)
      end.setUTCDate(ptr.getUTCDate() + 7)
      if (end > monthEnd) end.setTime(monthEnd.getTime())
      buckets.push({ label: `W${week}`, startStr: ds(start), endStr: ds(end) })
      ptr.setUTCDate(ptr.getUTCDate() + 7)
      week++
    }
    return buckets
  }

  // 3m / 6m / 1y — monthly buckets
  const count = period === "3m" ? 3 : period === "6m" ? 6 : 12
  const buckets: Bucket[] = []
  for (let i = count - 1; i >= 0; i--) {
    const bm = m - i
    const by = y + Math.floor(bm / 12)
    const bMonth = ((bm % 12) + 12) % 12
    const start = startOfMonth(by, bMonth)
    const end = startOfMonth(by, bMonth + 1)
    buckets.push({ label: MONTH_NAMES[bMonth]!, startStr: ds(start), endStr: ds(end) })
  }
  return buckets
}

export const GET = withGates(
  { action: "finance.chart.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const raw = req.nextUrl.searchParams.get("period") ?? "3m"
    const period: Period = (["1w", "1m", "3m", "6m", "1y"] as const).includes(raw as Period)
      ? (raw as Period)
      : "3m"

    const buckets = buildBuckets(period)
    const rangeStart = buckets[0]!.startStr
    const rangeEnd = buckets[buckets.length - 1]!.endStr

    const [invoiceRows, expenseRows] = await Promise.all([
      db
        .select({ issueDate: invoices.issueDate, total: invoices.total })
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, ctx.session.companyId),
            eq(invoices.status, "paid"),
            gte(invoices.issueDate, rangeStart),
            lt(invoices.issueDate, rangeEnd),
            isNull(invoices.deletedAt)
          )
        ),
      db
        .select({ date: expenses.date, amount: expenses.amount })
        .from(expenses)
        .where(
          and(
            eq(expenses.companyId, ctx.session.companyId),
            inArray(expenses.status, [...ACTIVE_STATUSES]),
            gte(expenses.date, rangeStart),
            lt(expenses.date, rangeEnd),
            isNull(expenses.deletedAt)
          )
        ),
    ])

    const revenue = buckets.map(() => 0)
    const expArr = buckets.map(() => 0)

    for (const row of invoiceRows) {
      const idx = buckets.findIndex((b) => row.issueDate >= b.startStr && row.issueDate < b.endStr)
      if (idx >= 0) revenue[idx]! += Number(row.total ?? 0)
    }

    for (const row of expenseRows) {
      const idx = buckets.findIndex((b) => row.date >= b.startStr && row.date < b.endStr)
      if (idx >= 0) expArr[idx]! += Number(row.amount ?? 0)
    }

    const toK = (n: number) => Math.round(n / 1000)

    return NextResponse.json({
      labels: buckets.map((b) => b.label),
      revenue: revenue.map(toK),
      expenses: expArr.map(toK),
    } satisfies ChartResponse)
  }
)
