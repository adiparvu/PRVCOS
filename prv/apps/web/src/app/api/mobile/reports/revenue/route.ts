import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { orders } from "@prv/db/schema"
import { eq, and, gte, lt, isNull, not, inArray, sql } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function fmtC(amount: number, currency = "RON"): string {
  const sym = currency === "EUR" ? "€" : "RON "
  if (amount >= 1_000_000) return `${sym}${(amount / 1_000_000).toFixed(2)}M`
  if (amount >= 1_000) return `${sym}${(amount / 1_000).toFixed(1)}k`
  return `${sym}${amount.toFixed(0)}`
}

function parseMoney(v: string | null | undefined): number {
  return parseFloat(v ?? "0") || 0
}

function monthLabel(d: Date): string {
  return d.toLocaleString("en", { month: "short", year: "2-digit" })
}

export const GET = withMobileAuth(async (_req: NextRequest, ctx) => {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)
  const cancelled = ["cancelled", "refunded"] as const

  const [mtdRow, lastMonthRow, ytdRow, trendRows] = await Promise.all([
    // MTD totals + count
    db
      .select({
        total: sql<string>`COALESCE(SUM(${orders.total}), '0')`,
        count: sql<string>`COUNT(*)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, ctx.companyId),
          gte(orders.createdAt, monthStart),
          not(inArray(orders.status, [...cancelled])),
          isNull(orders.deletedAt)
        )
      ),

    // Last month totals
    db
      .select({ total: sql<string>`COALESCE(SUM(${orders.total}), '0')` })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, ctx.companyId),
          gte(orders.createdAt, lastMonthStart),
          lt(orders.createdAt, monthStart),
          not(inArray(orders.status, [...cancelled])),
          isNull(orders.deletedAt)
        )
      ),

    // YTD totals + count
    db
      .select({
        total: sql<string>`COALESCE(SUM(${orders.total}), '0')`,
        count: sql<string>`COUNT(*)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, ctx.companyId),
          gte(orders.createdAt, yearStart),
          not(inArray(orders.status, [...cancelled])),
          isNull(orders.deletedAt)
        )
      ),

    // 12-month trend
    db
      .select({
        month: sql<string>`DATE_TRUNC('month', ${orders.createdAt})::date`,
        total: sql<string>`COALESCE(SUM(${orders.total}), '0')`,
        count: sql<string>`COUNT(*)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, ctx.companyId),
          gte(orders.createdAt, twelveMonthsAgo),
          not(inArray(orders.status, [...cancelled])),
          isNull(orders.deletedAt)
        )
      )
      .groupBy(sql`DATE_TRUNC('month', ${orders.createdAt})`)
      .orderBy(sql`DATE_TRUNC('month', ${orders.createdAt}) ASC`),
  ])

  const mtdTotal = parseMoney(mtdRow[0]?.total)
  const mtdCount = parseInt(mtdRow[0]?.count ?? "0")
  const lastMonthTotal = parseMoney(lastMonthRow[0]?.total)
  const ytdTotal = parseMoney(ytdRow[0]?.total)
  const ytdCount = parseInt(ytdRow[0]?.count ?? "0")

  const delta =
    lastMonthTotal > 0
      ? Math.round(((mtdTotal - lastMonthTotal) / Math.abs(lastMonthTotal)) * 100)
      : null

  const avgOrderValue = mtdCount > 0 ? mtdTotal / mtdCount : 0

  const trendMap = new Map(
    trendRows.map((r) => [
      r.month.slice(0, 7),
      { total: parseMoney(r.total), count: parseInt(r.count) },
    ])
  )

  const trend = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
    const key = d.toISOString().slice(0, 7)
    const row = trendMap.get(key) ?? { total: 0, count: 0 }
    return {
      month: monthLabel(d),
      total: row.total,
      totalFormatted: fmtC(row.total),
      count: row.count,
    }
  })

  return NextResponse.json({
    kpi: {
      mtdTotal,
      mtdFormatted: fmtC(mtdTotal),
      lastMonthTotal,
      lastMonthFormatted: fmtC(lastMonthTotal),
      delta,
      ytdTotal,
      ytdFormatted: fmtC(ytdTotal),
      mtdCount,
      ytdCount,
      avgOrderValue,
      avgOrderValueFormatted: fmtC(avgOrderValue),
    },
    trend,
  })
})
