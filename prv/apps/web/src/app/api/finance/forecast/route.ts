import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { invoices, expenses, clients } from "@prv/db/schema"
import { and, eq, gte, inArray, isNull } from "drizzle-orm"
import {
  projectPL,
  summarizeScenarios,
  breakEvenMonth,
  type ForecastInputs,
  type ForecastMonth,
  type ScenarioSummary,
} from "@/lib/finance/forecast"
import {
  computeCrmAnalytics,
  type LeadRecord,
  type LeadSource,
  type LeadStage,
} from "@/lib/crm-analytics"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const TRAILING_MONTHS = 3 // window used to derive monthly run rates
const PIPELINE_SPREAD_MONTHS = 3

export interface FinanceForecastResponse {
  assumptions: {
    monthlyRevenueRunRate: number
    weightedPipelineTotal: number
    pipelineSpreadMonths: number
    monthlyExpenseRunRate: number
    trailingMonths: number
  }
  horizons: Record<"3" | "6" | "12", ForecastMonth[]>
  scenarios: Record<"3" | "6" | "12", ScenarioSummary[]>
  breakEvenMonth: number | null
}

function num(v: string | null): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

// GET /api/finance/forecast — forward P&L projection (3/6/12 months) built from
// the trailing revenue run rate, the weighted sales pipeline, and the expense
// run rate, plus break-even and optimistic/base/conservative scenarios.
export const GET = withGates(
  { action: "finance.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const companyId = ctx.session.companyId
    const since = new Date(Date.now() - TRAILING_MONTHS * 30 * 86_400_000)
    const sinceISO = since.toISOString().slice(0, 10)

    const [paidInvoices, recentExpenses, leadRows] = await Promise.all([
      db
        .select({ total: invoices.total, paidAt: invoices.paidAt })
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, companyId),
            eq(invoices.status, "paid"),
            gte(invoices.paidAt, since),
            isNull(invoices.deletedAt)
          )
        ),
      db
        .select({ amount: expenses.amount, date: expenses.date })
        .from(expenses)
        .where(
          and(
            eq(expenses.companyId, companyId),
            inArray(expenses.status, ["approved", "paid"]),
            gte(expenses.date, sinceISO)
          )
        ),
      db
        .select({
          metadata: clients.metadata,
          createdAt: clients.createdAt,
          updatedAt: clients.updatedAt,
        })
        .from(clients)
        .where(
          and(
            eq(clients.companyId, companyId),
            eq(clients.status, "prospect"),
            isNull(clients.deletedAt)
          )
        ),
    ])

    const trailingRevenue = paidInvoices.reduce((s, r) => s + num(r.total), 0)
    const trailingExpense = recentExpenses.reduce((s, r) => s + num(r.amount), 0)
    const monthlyRevenueRunRate = Math.round((trailingRevenue / TRAILING_MONTHS) * 100) / 100
    const monthlyExpenseRunRate = Math.round((trailingExpense / TRAILING_MONTHS) * 100) / 100

    const leads: LeadRecord[] = leadRows.map((r) => {
      const meta = (r.metadata ?? {}) as Record<string, unknown>
      return {
        stage: (meta.stage as LeadStage) ?? "new",
        source: (meta.source as LeadSource) ?? "website",
        estimatedValue: typeof meta.estimatedValue === "number" ? meta.estimatedValue : 0,
        rep: "",
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }
    })
    const weightedPipelineTotal = computeCrmAnalytics(leads, Date.now()).weightedPipelineValue

    const inputs: ForecastInputs = {
      monthlyRevenueRunRate,
      weightedPipelineTotal,
      pipelineSpreadMonths: PIPELINE_SPREAD_MONTHS,
      monthlyExpenseRunRate,
      openingCumulative: 0,
    }

    const horizons = {
      "3": projectPL(inputs, 3),
      "6": projectPL(inputs, 6),
      "12": projectPL(inputs, 12),
    }
    const scenarios = {
      "3": summarizeScenarios(inputs, 3),
      "6": summarizeScenarios(inputs, 6),
      "12": summarizeScenarios(inputs, 12),
    }

    const response: FinanceForecastResponse = {
      assumptions: {
        monthlyRevenueRunRate,
        weightedPipelineTotal,
        pipelineSpreadMonths: PIPELINE_SPREAD_MONTHS,
        monthlyExpenseRunRate,
        trailingMonths: TRAILING_MONTHS,
      },
      horizons,
      scenarios,
      breakEvenMonth: breakEvenMonth(horizons["12"]),
    }

    return NextResponse.json(response)
  }
)
