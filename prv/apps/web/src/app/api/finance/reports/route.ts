import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { invoices, expenses } from "@prv/db/schema"
import { and, eq, gte, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MONTH_LABELS_RO = [
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

export interface FinanceReport {
  id: string
  title: string
  revenue: number
  expensesTotal: number
  profit: number
  transactionCount: number
  dateLabel: string
  statusLabel: string
  statusColor: string
}

export const GET = withGates(
  { action: "finance.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session

    const now = new Date()
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    const threeMonthsAgoStr = threeMonthsAgo.toISOString().slice(0, 10)

    const [invRows, expRows] = await Promise.all([
      db
        .select({ total: invoices.total, createdAt: invoices.createdAt })
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, companyId),
            eq(invoices.status, "paid"),
            isNull(invoices.deletedAt),
            gte(invoices.createdAt, threeMonthsAgo)
          )
        ),
      db
        .select({ amount: expenses.amount, date: expenses.date })
        .from(expenses)
        .where(
          and(
            eq(expenses.companyId, companyId),
            eq(expenses.status, "approved"),
            isNull(expenses.deletedAt),
            gte(expenses.date, threeMonthsAgoStr)
          )
        ),
    ])

    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    const reports: FinanceReport[] = []

    for (let i = 2; i >= 0; i--) {
      const monthDate = new Date(currentYear, currentMonth - i, 1)
      const year = monthDate.getFullYear()
      const month = monthDate.getMonth()
      const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`
      const isCurrent = i === 0

      const monthInv = invRows.filter((r) => {
        const d = new Date(r.createdAt)
        return d.getFullYear() === year && d.getMonth() === month
      })
      const revenue = monthInv.reduce((s, r) => s + Number(r.total), 0)

      const monthExp = expRows.filter((r) => (r.date as string).startsWith(monthStr))
      const expensesTotal = monthExp.reduce((s, r) => s + Number(r.amount), 0)

      const genDate = new Date(year, month + 1, 1)
      const dateLabel = isCurrent
        ? "In Progress"
        : `${genDate.getDate()} ${MONTH_LABELS_RO[genDate.getMonth()]} ${genDate.getFullYear()}`

      reports.push({
        id: `report-${monthStr}`,
        title: `Monthly Report · ${MONTH_LABELS_RO[month]} ${year}`,
        revenue,
        expensesTotal,
        profit: revenue - expensesTotal,
        transactionCount: monthInv.length + monthExp.length,
        dateLabel,
        statusLabel: isCurrent ? "In Progress" : "Completed",
        statusColor: isCurrent ? "rgba(255,159,10,.95)" : "rgba(48,209,88,.95)",
      })
    }

    return NextResponse.json({ reports })
  }
)
