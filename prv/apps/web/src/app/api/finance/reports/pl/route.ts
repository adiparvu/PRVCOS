import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { invoices, expenses } from "@prv/db/schema"
import { and, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const RO_MONTHS = [
  "Ian",
  "Feb",
  "Mar",
  "Apr",
  "Mai",
  "Iun",
  "Iul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]
const REVENUE_STATUSES = ["paid", "overdue"] as const
const COST_STATUSES = ["approved", "paid"] as const

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function monthRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${pad(month)}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const to = `${nextYear}-${pad(nextMonth)}-01`
  return { from, to }
}

function quarterRange(year: number, q: number): { from: string; to: string } {
  const startMonth = (q - 1) * 3 + 1
  const endMonth = startMonth + 3
  const endYear = endMonth > 12 ? year + 1 : year
  return {
    from: `${year}-${pad(startMonth)}-01`,
    to: `${endYear}-${pad(endMonth > 12 ? endMonth - 12 : endMonth)}-01`,
  }
}

async function queryPeriodRevenue(companyId: string, from: string, to: string) {
  const [row] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${invoices.total}), '0')`,
      vat: sql<string>`COALESCE(SUM(${invoices.vatAmount}), '0')`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.companyId, companyId),
        isNull(invoices.deletedAt),
        inArray(invoices.status, [...REVENUE_STATUSES]),
        gte(invoices.issueDate, from),
        lt(invoices.issueDate, to)
      )
    )
  return { total: parseFloat(row?.total ?? "0"), vat: parseFloat(row?.vat ?? "0") }
}

async function queryPeriodExpenses(companyId: string, from: string, to: string) {
  const [row] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${expenses.amount}), '0')`,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.companyId, companyId),
        isNull(expenses.deletedAt),
        inArray(expenses.status, [...COST_STATUSES]),
        gte(expenses.date, from),
        lt(expenses.date, to)
      )
    )
  const total = parseFloat(row?.total ?? "0")
  // VAT deductible estimated at standard 19% rate (gross-inclusive)
  const vatDeductible = Math.round(((total * 19) / 119) * 100) / 100
  return { total, vatDeductible }
}

function buildPeriodResult(
  key: string,
  label: string,
  revenue: number,
  revenueVat: number,
  expensesTotal: number,
  expenseVat: number
) {
  const grossProfit = revenue - expensesTotal
  const grossMarginPct = revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0
  return {
    key,
    label,
    revenue,
    expenses: expensesTotal,
    grossProfit,
    grossMarginPct,
    vatCollected: revenueVat,
    vatDeductible: expenseVat,
    netVat: Math.round((revenueVat - expenseVat) * 100) / 100,
  }
}

export const GET = withGates(
  { action: "finance.reports.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const searchParams = req.nextUrl.searchParams
    const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10)
    const periodType = (searchParams.get("periodType") ?? "monthly") as
      | "monthly"
      | "quarterly"
      | "annual"

    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 })
    }

    if (periodType === "monthly") {
      const periods = await Promise.all(
        Array.from({ length: 12 }, (_, i) => i + 1).map(async (m) => {
          const { from, to } = monthRange(year, m)
          const [rev, exp] = await Promise.all([
            queryPeriodRevenue(companyId, from, to),
            queryPeriodExpenses(companyId, from, to),
          ])
          const key = `${year}-${pad(m)}`
          const label = `${RO_MONTHS[m - 1]} ${year}`
          return buildPeriodResult(key, label, rev.total, rev.vat, exp.total, exp.vatDeductible)
        })
      )

      const totals = periods.reduce(
        (acc, p) => ({
          revenue: acc.revenue + p.revenue,
          expenses: acc.expenses + p.expenses,
          grossProfit: acc.grossProfit + p.grossProfit,
          vatCollected: acc.vatCollected + p.vatCollected,
          vatDeductible: acc.vatDeductible + p.vatDeductible,
          netVat: acc.netVat + p.netVat,
        }),
        { revenue: 0, expenses: 0, grossProfit: 0, vatCollected: 0, vatDeductible: 0, netVat: 0 }
      )

      return NextResponse.json({
        year,
        periodType,
        periods,
        totals: {
          ...totals,
          grossMarginPct:
            totals.revenue > 0 ? Math.round((totals.grossProfit / totals.revenue) * 1000) / 10 : 0,
        },
        currency: "RON",
      })
    }

    if (periodType === "quarterly") {
      const periods = await Promise.all(
        [1, 2, 3, 4].map(async (q) => {
          const { from, to } = quarterRange(year, q)
          const [rev, exp] = await Promise.all([
            queryPeriodRevenue(companyId, from, to),
            queryPeriodExpenses(companyId, from, to),
          ])
          return buildPeriodResult(
            `${year}-Q${q}`,
            `T${q} ${year}`,
            rev.total,
            rev.vat,
            exp.total,
            exp.vatDeductible
          )
        })
      )

      const totals = periods.reduce(
        (acc, p) => ({
          revenue: acc.revenue + p.revenue,
          expenses: acc.expenses + p.expenses,
          grossProfit: acc.grossProfit + p.grossProfit,
          vatCollected: acc.vatCollected + p.vatCollected,
          vatDeductible: acc.vatDeductible + p.vatDeductible,
          netVat: acc.netVat + p.netVat,
        }),
        { revenue: 0, expenses: 0, grossProfit: 0, vatCollected: 0, vatDeductible: 0, netVat: 0 }
      )

      return NextResponse.json({
        year,
        periodType,
        periods,
        totals: {
          ...totals,
          grossMarginPct:
            totals.revenue > 0 ? Math.round((totals.grossProfit / totals.revenue) * 1000) / 10 : 0,
        },
        currency: "RON",
      })
    }

    // annual
    const from = `${year}-01-01`
    const to = `${year + 1}-01-01`
    const [rev, exp] = await Promise.all([
      queryPeriodRevenue(companyId, from, to),
      queryPeriodExpenses(companyId, from, to),
    ])
    const period = buildPeriodResult(
      String(year),
      String(year),
      rev.total,
      rev.vat,
      exp.total,
      exp.vatDeductible
    )

    return NextResponse.json({
      year,
      periodType,
      periods: [period],
      totals: { ...period, grossMarginPct: period.grossMarginPct },
      currency: "RON",
    })
  }
)
