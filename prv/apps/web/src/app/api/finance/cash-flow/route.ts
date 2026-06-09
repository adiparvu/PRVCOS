import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { invoices, orders, expenses, payrollRuns } from "@prv/db/schema"
import { and, eq, gte, isNotNull, isNull, lt, lte, or, sum } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// ── Types (API contract unchanged) ───────────────────────────────────────────

export interface CashFlowEntry {
  date: string
  inflow: number
  outflow: number
  balance: number
  forecast: boolean
}

export interface CashFlowCategory {
  label: string
  amount: number
  type: "in" | "out"
}

export interface CashFlowMeta {
  currentBalance: number
  totalIn: number
  totalOut: number
  net: number
  runwayDays: number
  avgMonthlyBurn: number
  forecastBalance30d: number
  forecastBalance60d: number
  forecastBalance90d: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const EXPENSE_LABELS: Record<string, string> = {
  materials: "Materials",
  labor: "Labor",
  equipment: "Equipment",
  transport: "Transport",
  rent: "Rent",
  utilities: "Utilities",
  marketing: "Marketing",
  salaries: "Salaries",
  subscriptions: "Subscriptions",
  other: "Other Expenses",
}

function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000)
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function tsToIsoDate(ts: Date | string | null): string {
  if (!ts) return ""
  return new Date(ts).toISOString().slice(0, 10)
}

// ── GET ───────────────────────────────────────────────────────────────────────

export const GET = withGates(
  { action: "finance.cash_flow.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const period = parseInt(req.nextUrl.searchParams.get("period") ?? "30", 10)
    const clampedPeriod = [30, 60, 90].includes(period) ? period : 30

    const today = utcDay(new Date())
    const todayStr = isoDate(today)
    const historyStart = addDays(today, -90)
    const historyStartStr = isoDate(historyStart)

    // ── Fetch events in the 90-day window ────────────────────────────────────

    const [paidInvoices, confirmedOrders, paidExpenses, donePayrolls] = await Promise.all([
      db
        .select({ date: invoices.paidAt, amount: invoices.total })
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, companyId),
            eq(invoices.status, "paid"),
            isNotNull(invoices.paidAt),
            gte(invoices.paidAt, historyStart),
            isNull(invoices.deletedAt)
          )
        ),

      db
        .select({ date: orders.createdAt, amount: orders.total })
        .from(orders)
        .where(
          and(
            eq(orders.companyId, companyId),
            or(eq(orders.status, "delivered"), eq(orders.status, "confirmed")),
            gte(orders.createdAt, historyStart),
            lte(orders.createdAt, today),
            isNull(orders.deletedAt)
          )
        ),

      db
        .select({ date: expenses.date, amount: expenses.amount, category: expenses.category })
        .from(expenses)
        .where(
          and(
            eq(expenses.companyId, companyId),
            or(eq(expenses.status, "approved"), eq(expenses.status, "paid")),
            gte(expenses.date, historyStartStr),
            lte(expenses.date, todayStr),
            isNull(expenses.deletedAt)
          )
        ),

      db
        .select({ date: payrollRuns.periodEnd, amount: payrollRuns.netPaid })
        .from(payrollRuns)
        .where(
          and(
            eq(payrollRuns.companyId, companyId),
            eq(payrollRuns.status, "done"),
            gte(payrollRuns.periodEnd, historyStartStr),
            lte(payrollRuns.periodEnd, todayStr)
          )
        ),
    ])

    // ── Opening balance (everything before the 90-day window) ────────────────

    const [openingInvRow, openingOrdRow, openingExpRow, openingPayRow] = await Promise.all([
      db
        .select({ total: sum(invoices.total) })
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, companyId),
            eq(invoices.status, "paid"),
            isNotNull(invoices.paidAt),
            lt(invoices.paidAt, historyStart),
            isNull(invoices.deletedAt)
          )
        ),

      db
        .select({ total: sum(orders.total) })
        .from(orders)
        .where(
          and(
            eq(orders.companyId, companyId),
            or(eq(orders.status, "delivered"), eq(orders.status, "confirmed")),
            lt(orders.createdAt, historyStart),
            isNull(orders.deletedAt)
          )
        ),

      db
        .select({ total: sum(expenses.amount) })
        .from(expenses)
        .where(
          and(
            eq(expenses.companyId, companyId),
            or(eq(expenses.status, "approved"), eq(expenses.status, "paid")),
            lt(expenses.date, historyStartStr),
            isNull(expenses.deletedAt)
          )
        ),

      db
        .select({ total: sum(payrollRuns.netPaid) })
        .from(payrollRuns)
        .where(
          and(
            eq(payrollRuns.companyId, companyId),
            eq(payrollRuns.status, "done"),
            lt(payrollRuns.periodEnd, historyStartStr)
          )
        ),
    ])

    const openingBalance =
      Number(openingInvRow[0]?.total ?? 0) +
      Number(openingOrdRow[0]?.total ?? 0) -
      Number(openingExpRow[0]?.total ?? 0) -
      Number(openingPayRow[0]?.total ?? 0)

    // ── Aggregate events into day maps ────────────────────────────────────────

    const inflowByDay = new Map<string, number>()
    const outflowByDay = new Map<string, number>()
    const expenseByCategory = new Map<string, number>()

    for (const inv of paidInvoices) {
      const d = tsToIsoDate(inv.date)
      if (d) inflowByDay.set(d, (inflowByDay.get(d) ?? 0) + Number(inv.amount))
    }
    for (const ord of confirmedOrders) {
      const d = tsToIsoDate(ord.date)
      if (d) inflowByDay.set(d, (inflowByDay.get(d) ?? 0) + Number(ord.amount))
    }
    for (const exp of paidExpenses) {
      const d = exp.date as string
      outflowByDay.set(d, (outflowByDay.get(d) ?? 0) + Number(exp.amount))
      expenseByCategory.set(
        exp.category,
        (expenseByCategory.get(exp.category) ?? 0) + Number(exp.amount)
      )
    }
    let totalPayroll = 0
    for (const pr of donePayrolls) {
      const d = pr.date as string
      outflowByDay.set(d, (outflowByDay.get(d) ?? 0) + Number(pr.amount))
      totalPayroll += Number(pr.amount)
    }

    // ── Build 90-day historical entries ──────────────────────────────────────

    const allEntries: CashFlowEntry[] = []
    let runningBalance = openingBalance

    for (let i = 89; i >= 0; i--) {
      const d = addDays(today, -i)
      const dStr = isoDate(d)
      const inflow = Math.round(inflowByDay.get(dStr) ?? 0)
      const outflow = Math.round(outflowByDay.get(dStr) ?? 0)
      runningBalance += inflow - outflow
      allEntries.push({
        date: dStr,
        inflow,
        outflow,
        balance: Math.round(runningBalance),
        forecast: false,
      })
    }

    const currentBalance = runningBalance

    // ── 30-day forecast using trailing averages ───────────────────────────────

    const last30 = allEntries.slice(-30)
    const avgDailyInflow = last30.reduce((s, e) => s + e.inflow, 0) / 30
    const avgDailyOutflow = last30.reduce((s, e) => s + e.outflow, 0) / 30

    const forecastEntries: CashFlowEntry[] = []
    let forecastBalance = currentBalance

    for (let i = 1; i <= 30; i++) {
      const inflow = Math.round(avgDailyInflow)
      const outflow = Math.round(avgDailyOutflow)
      forecastBalance += inflow - outflow
      forecastEntries.push({
        date: isoDate(addDays(today, i)),
        inflow,
        outflow,
        balance: Math.round(forecastBalance),
        forecast: true,
      })
    }

    // ── Period-scoped meta ────────────────────────────────────────────────────

    const periodStartStr = isoDate(addDays(today, -clampedPeriod))
    const periodEntries = allEntries.filter((e) => e.date >= periodStartStr)

    const totalIn = periodEntries.reduce((s, e) => s + e.inflow, 0)
    const totalOut = periodEntries.reduce((s, e) => s + e.outflow, 0)
    const avgDailyBurn = totalOut / clampedPeriod || 1
    const runwayDays = avgDailyBurn > 0 ? Math.round(currentBalance / avgDailyBurn) : 9999

    const meta: CashFlowMeta = {
      currentBalance: Math.round(currentBalance),
      totalIn,
      totalOut,
      net: totalIn - totalOut,
      runwayDays,
      avgMonthlyBurn: Math.round(avgDailyBurn * 30),
      forecastBalance30d: forecastEntries[29]?.balance ?? currentBalance,
      forecastBalance60d: forecastEntries[29]?.balance ?? currentBalance,
      forecastBalance90d: forecastEntries[29]?.balance ?? currentBalance,
    }

    // ── Categories ────────────────────────────────────────────────────────────

    const totalInvoiceInflow = paidInvoices.reduce((s, i) => s + Number(i.amount), 0)
    const totalOrderInflow = confirmedOrders.reduce((s, o) => s + Number(o.amount), 0)

    const categories: CashFlowCategory[] = [
      ...(totalInvoiceInflow > 0
        ? [
            {
              label: "Client Invoices",
              amount: Math.round(totalInvoiceInflow),
              type: "in" as const,
            },
          ]
        : []),
      ...(totalOrderInflow > 0
        ? [{ label: "Orders", amount: Math.round(totalOrderInflow), type: "in" as const }]
        : []),
      ...[...expenseByCategory.entries()]
        .filter(([, amt]) => amt > 0)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, amt]) => ({
          label: EXPENSE_LABELS[cat] ?? cat,
          amount: Math.round(amt),
          type: "out" as const,
        })),
      ...(totalPayroll > 0
        ? [{ label: "Payroll", amount: Math.round(totalPayroll), type: "out" as const }]
        : []),
    ]

    return NextResponse.json({
      entries: [...periodEntries, ...forecastEntries],
      periodEntries,
      forecastEntries,
      categories,
      meta,
    })
  }
)
