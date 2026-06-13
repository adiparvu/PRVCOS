import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { invoices, expenses } from "@prv/db/schema"
import { and, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const REVENUE_STATUSES = ["paid", "overdue"] as const
const COST_STATUSES = ["approved", "paid"] as const

export const GET = withGates(
  { action: "finance.reports.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const searchParams = req.nextUrl.searchParams

    const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10)
    const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1), 10)

    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 })
    }
    if (isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid month (1-12)" }, { status: 400 })
    }

    const m = String(month).padStart(2, "0")
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const nm = String(nextMonth).padStart(2, "0")
    const fromDate = `${year}-${m}-01`
    const toDate = `${nextYear}-${nm}-01`
    const periodKey = `${year}-${m}`

    const [invRow, expRow, invCountRow, expCountRow] = await Promise.all([
      db
        .select({
          vatCollected: sql<string>`COALESCE(SUM(${invoices.vatAmount}), '0')`,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, companyId),
            isNull(invoices.deletedAt),
            inArray(invoices.status, [...REVENUE_STATUSES]),
            gte(invoices.issueDate, fromDate),
            lt(invoices.issueDate, toDate)
          )
        ),
      db
        .select({
          totalExpenses: sql<string>`COALESCE(SUM(${expenses.amount}), '0')`,
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.companyId, companyId),
            isNull(expenses.deletedAt),
            inArray(expenses.status, [...COST_STATUSES]),
            gte(expenses.date, fromDate),
            lt(expenses.date, toDate)
          )
        ),
      db
        .select({ cnt: sql<number>`COUNT(*)::int` })
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, companyId),
            isNull(invoices.deletedAt),
            inArray(invoices.status, [...REVENUE_STATUSES]),
            gte(invoices.issueDate, fromDate),
            lt(invoices.issueDate, toDate)
          )
        ),
      db
        .select({ cnt: sql<number>`COUNT(*)::int` })
        .from(expenses)
        .where(
          and(
            eq(expenses.companyId, companyId),
            isNull(expenses.deletedAt),
            inArray(expenses.status, [...COST_STATUSES]),
            gte(expenses.date, fromDate),
            lt(expenses.date, toDate)
          )
        ),
    ])

    const vatCollected = parseFloat(invRow[0]?.vatCollected ?? "0")
    const totalExpenses = parseFloat(expRow[0]?.totalExpenses ?? "0")
    // VAT deductible: standard Romanian rate 19%, computed gross-inclusive
    const vatDeductible = Math.round(((totalExpenses * 19) / 119) * 100) / 100
    const vatDue = Math.round((vatCollected - vatDeductible) * 100) / 100

    return NextResponse.json({
      period: periodKey,
      year,
      month,
      vatCollected,
      vatDeductible,
      vatDue,
      currency: "RON",
      invoiceCount: invCountRow[0]?.cnt ?? 0,
      expenseCount: expCountRow[0]?.cnt ?? 0,
    })
  }
)
