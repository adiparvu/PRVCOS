import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { orders, invoices, expenses } from "@prv/db/schema"
import { eq, and, gte, lt, isNull, not, inArray, notInArray, sql } from "drizzle-orm"

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

function monthLabel(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString("en", { month: "short", year: "2-digit" })
}

export const GET = withMobileAuth(async (_req: NextRequest, ctx) => {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const cancelledStatuses = ["cancelled", "refunded"] as const

  const [
    // P&L — current month
    revMtdRow,
    expMtdRow,
    // P&L — last month
    revLastRow,
    expLastRow,
    // P&L — YTD
    revYtdRow,
    expYtdRow,
    // P&L — 6-month trend
    revTrendRows,
    expTrendRows,
    // Cash flow — current month
    cashInMtdRow,
    cashOutMtdRow,
    // Cash flow — 6-month trend
    cashInTrendRows,
    cashOutTrendRows,
    // Tax — current month VAT
    vatMtdRow,
    // Tax — 6-month VAT trend
    vatTrendRows,
  ] = await Promise.all([
    // Revenue MTD (orders)
    db
      .select({ total: sql<string>`COALESCE(SUM(${orders.total}), '0')` })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, ctx.companyId),
          gte(orders.createdAt, monthStart),
          not(inArray(orders.status, [...cancelledStatuses])),
          isNull(orders.deletedAt)
        )
      ),

    // Expenses MTD
    db
      .select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), '0')` })
      .from(expenses)
      .where(
        and(
          eq(expenses.companyId, ctx.companyId),
          gte(expenses.date, monthStart.toISOString().slice(0, 10)),
          notInArray(expenses.status, ["draft", "rejected"]),
          isNull(expenses.deletedAt)
        )
      ),

    // Revenue last month
    db
      .select({ total: sql<string>`COALESCE(SUM(${orders.total}), '0')` })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, ctx.companyId),
          gte(orders.createdAt, lastMonthStart),
          lt(orders.createdAt, monthStart),
          not(inArray(orders.status, [...cancelledStatuses])),
          isNull(orders.deletedAt)
        )
      ),

    // Expenses last month
    db
      .select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), '0')` })
      .from(expenses)
      .where(
        and(
          eq(expenses.companyId, ctx.companyId),
          gte(expenses.date, lastMonthStart.toISOString().slice(0, 10)),
          lt(expenses.date, monthStart.toISOString().slice(0, 10)),
          notInArray(expenses.status, ["draft", "rejected"]),
          isNull(expenses.deletedAt)
        )
      ),

    // Revenue YTD
    db
      .select({ total: sql<string>`COALESCE(SUM(${orders.total}), '0')` })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, ctx.companyId),
          gte(orders.createdAt, yearStart),
          not(inArray(orders.status, [...cancelledStatuses])),
          isNull(orders.deletedAt)
        )
      ),

    // Expenses YTD
    db
      .select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), '0')` })
      .from(expenses)
      .where(
        and(
          eq(expenses.companyId, ctx.companyId),
          gte(expenses.date, yearStart.toISOString().slice(0, 10)),
          notInArray(expenses.status, ["draft", "rejected"]),
          isNull(expenses.deletedAt)
        )
      ),

    // Revenue 6-month trend
    db
      .select({
        month: sql<string>`DATE_TRUNC('month', ${orders.createdAt})::date`,
        total: sql<string>`COALESCE(SUM(${orders.total}), '0')`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, ctx.companyId),
          gte(orders.createdAt, sixMonthsAgo),
          not(inArray(orders.status, [...cancelledStatuses])),
          isNull(orders.deletedAt)
        )
      )
      .groupBy(sql`DATE_TRUNC('month', ${orders.createdAt})`)
      .orderBy(sql`DATE_TRUNC('month', ${orders.createdAt}) ASC`),

    // Expenses 6-month trend
    db
      .select({
        month: sql<string>`DATE_TRUNC('month', ${expenses.date}::timestamp)::date`,
        total: sql<string>`COALESCE(SUM(${expenses.amount}), '0')`,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.companyId, ctx.companyId),
          gte(expenses.date, sixMonthsAgo.toISOString().slice(0, 10)),
          notInArray(expenses.status, ["draft", "rejected"]),
          isNull(expenses.deletedAt)
        )
      )
      .groupBy(sql`DATE_TRUNC('month', ${expenses.date}::timestamp)`)
      .orderBy(sql`DATE_TRUNC('month', ${expenses.date}::timestamp) ASC`),

    // Cash in MTD (paid invoices this month)
    db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.total}), '0')` })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, ctx.companyId),
          eq(invoices.status, "paid"),
          gte(invoices.paidAt, monthStart),
          isNull(invoices.deletedAt)
        )
      ),

    // Cash out MTD (paid expenses this month)
    db
      .select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), '0')` })
      .from(expenses)
      .where(
        and(
          eq(expenses.companyId, ctx.companyId),
          gte(expenses.date, monthStart.toISOString().slice(0, 10)),
          eq(expenses.status, "paid"),
          isNull(expenses.deletedAt)
        )
      ),

    // Cash in 6-month trend
    db
      .select({
        month: sql<string>`DATE_TRUNC('month', ${invoices.paidAt})::date`,
        total: sql<string>`COALESCE(SUM(${invoices.total}), '0')`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, ctx.companyId),
          eq(invoices.status, "paid"),
          gte(invoices.paidAt, sixMonthsAgo),
          isNull(invoices.deletedAt)
        )
      )
      .groupBy(sql`DATE_TRUNC('month', ${invoices.paidAt})`)
      .orderBy(sql`DATE_TRUNC('month', ${invoices.paidAt}) ASC`),

    // Cash out 6-month trend
    db
      .select({
        month: sql<string>`DATE_TRUNC('month', ${expenses.date}::timestamp)::date`,
        total: sql<string>`COALESCE(SUM(${expenses.amount}), '0')`,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.companyId, ctx.companyId),
          gte(expenses.date, sixMonthsAgo.toISOString().slice(0, 10)),
          eq(expenses.status, "paid"),
          isNull(expenses.deletedAt)
        )
      )
      .groupBy(sql`DATE_TRUNC('month', ${expenses.date}::timestamp)`)
      .orderBy(sql`DATE_TRUNC('month', ${expenses.date}::timestamp) ASC`),

    // VAT MTD from paid invoices
    db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.vatAmount}), '0')` })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, ctx.companyId),
          eq(invoices.status, "paid"),
          gte(invoices.paidAt, monthStart),
          isNull(invoices.deletedAt)
        )
      ),

    // VAT 6-month trend
    db
      .select({
        month: sql<string>`DATE_TRUNC('month', ${invoices.paidAt})::date`,
        total: sql<string>`COALESCE(SUM(${invoices.vatAmount}), '0')`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, ctx.companyId),
          eq(invoices.status, "paid"),
          gte(invoices.paidAt, sixMonthsAgo),
          isNull(invoices.deletedAt)
        )
      )
      .groupBy(sql`DATE_TRUNC('month', ${invoices.paidAt})`)
      .orderBy(sql`DATE_TRUNC('month', ${invoices.paidAt}) ASC`),
  ])

  // ── P&L calculations ─────────────────────────────────────────────────────────

  const revMtd = parseMoney(revMtdRow[0]?.total)
  const expMtd = parseMoney(expMtdRow[0]?.total)
  const profitMtd = revMtd - expMtd
  const marginMtd = revMtd > 0 ? Math.round((profitMtd / revMtd) * 100) : 0

  const revLast = parseMoney(revLastRow[0]?.total)
  const expLast = parseMoney(expLastRow[0]?.total)
  const profitLast = revLast - expLast
  const marginLast = revLast > 0 ? Math.round((profitLast / revLast) * 100) : 0

  const revYtd = parseMoney(revYtdRow[0]?.total)
  const expYtd = parseMoney(expYtdRow[0]?.total)
  const profitYtd = revYtd - expYtd
  const marginYtd = revYtd > 0 ? Math.round((profitYtd / revYtd) * 100) : 0

  const profitDelta =
    profitLast > 0 ? Math.round(((profitMtd - profitLast) / Math.abs(profitLast)) * 100) : null

  // Build 6-month trend
  const revMap = new Map(revTrendRows.map((r) => [r.month.slice(0, 7), parseMoney(r.total)]))
  const expMap = new Map(expTrendRows.map((r) => [r.month.slice(0, 7), parseMoney(r.total)]))

  const plTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const key = d.toISOString().slice(0, 7)
    const rev = revMap.get(key) ?? 0
    const exp = expMap.get(key) ?? 0
    return { month: monthLabel(d.toISOString()), revenue: rev, expenses: exp, profit: rev - exp }
  })

  // ── Cash flow calculations ────────────────────────────────────────────────────

  const cashInMtd = parseMoney(cashInMtdRow[0]?.total)
  const cashOutMtd = parseMoney(cashOutMtdRow[0]?.total)
  const cashNetMtd = cashInMtd - cashOutMtd

  const cashInMap = new Map(cashInTrendRows.map((r) => [r.month.slice(0, 7), parseMoney(r.total)]))
  const cashOutMap = new Map(
    cashOutTrendRows.map((r) => [r.month.slice(0, 7), parseMoney(r.total)])
  )

  const cashTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const key = d.toISOString().slice(0, 7)
    const inAmt = cashInMap.get(key) ?? 0
    const outAmt = cashOutMap.get(key) ?? 0
    return { month: monthLabel(d.toISOString()), in: inAmt, out: outAmt, net: inAmt - outAmt }
  })

  // ── Tax calculations ──────────────────────────────────────────────────────────

  const vatMtd = parseMoney(vatMtdRow[0]?.total)
  const qtr = Math.floor(now.getMonth() / 3) + 1
  const period = `Q${qtr} ${now.getFullYear()}`

  const vatMap = new Map(vatTrendRows.map((r) => [r.month.slice(0, 7), parseMoney(r.total)]))
  const vatTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const key = d.toISOString().slice(0, 7)
    return { month: monthLabel(d.toISOString()), vat: vatMap.get(key) ?? 0 }
  })

  // ── Forecast (linear extrapolation from last 3 months revenue avg) ───────────

  const last3Rev = plTrend.slice(-3).map((m) => m.revenue)
  const avgLast3 = last3Rev.reduce((s, v) => s + v, 0) / 3
  const forecastNext = Math.round(avgLast3 * 1.05)

  return NextResponse.json({
    pl: {
      mtd: {
        revenue: revMtd,
        revenueFormatted: fmtC(revMtd),
        expenses: expMtd,
        expensesFormatted: fmtC(expMtd),
        profit: profitMtd,
        profitFormatted: fmtC(profitMtd),
        margin: marginMtd,
        delta: profitDelta,
      },
      lastMonth: {
        revenue: revLast,
        revenueFormatted: fmtC(revLast),
        expenses: expLast,
        expensesFormatted: fmtC(expLast),
        profit: profitLast,
        profitFormatted: fmtC(profitLast),
        margin: marginLast,
      },
      ytd: {
        revenue: revYtd,
        revenueFormatted: fmtC(revYtd),
        expenses: expYtd,
        expensesFormatted: fmtC(expYtd),
        profit: profitYtd,
        profitFormatted: fmtC(profitYtd),
        margin: marginYtd,
      },
      trend: plTrend,
    },
    cashflow: {
      mtd: {
        in: cashInMtd,
        inFormatted: fmtC(cashInMtd),
        out: cashOutMtd,
        outFormatted: fmtC(cashOutMtd),
        net: cashNetMtd,
        netFormatted: fmtC(Math.abs(cashNetMtd)),
        netPositive: cashNetMtd >= 0,
      },
      trend: cashTrend,
    },
    tax: {
      vatMtd,
      vatMtdFormatted: fmtC(vatMtd),
      period,
      trend: vatTrend,
    },
    forecast: {
      nextMonth: forecastNext,
      nextMonthFormatted: fmtC(forecastNext),
      basedOn: "3-month revenue average",
    },
  })
})
