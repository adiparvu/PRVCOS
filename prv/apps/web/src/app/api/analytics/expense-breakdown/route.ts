import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { expenses } from "@prv/db/schema"
import { and, eq, gte, isNull } from "drizzle-orm"
import {
  computeExpenseBreakdown,
  type ExpenseBreakdown,
  type ExpenseStatus,
} from "@/lib/expense-breakdown"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const LOOKBACK_DAYS = 200 // covers the 6-month trend window with headroom

export type ExpenseBreakdownResponse = ExpenseBreakdown

// GET /api/analytics/expense-breakdown — committed spend, paid vs pending, by
// category, and the 6-month spend trend from the expense ledger.
export const GET = withGates(
  { action: "analytics.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const sinceStr = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString().slice(0, 10)

    const rows = await db
      .select({
        category: expenses.category,
        status: expenses.status,
        amount: expenses.amount,
        date: expenses.date,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.companyId, ctx.session.companyId),
          isNull(expenses.deletedAt),
          gte(expenses.date, sinceStr)
        )
      )

    const breakdown = computeExpenseBreakdown(
      rows.map((r) => ({
        category: r.category as string,
        status: r.status as ExpenseStatus,
        amount: Number(r.amount ?? 0),
        date: String(r.date),
      })),
      Date.now(),
      6
    )

    return NextResponse.json(breakdown)
  }
)
