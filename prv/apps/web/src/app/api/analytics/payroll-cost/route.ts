import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { payrollRuns } from "@prv/db/schema"
import { and, eq, gte } from "drizzle-orm"
import {
  computePayrollCost,
  type PayrollCost,
  type PayrollType,
  type PayrollStatus,
} from "@/lib/payroll-cost"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const LOOKBACK_DAYS = 200 // covers the 6-month trend window with headroom

export type PayrollCostResponse = PayrollCost

// GET /api/analytics/payroll-cost — payroll gross/net cost, deductions, avg per
// employee, by-type and status breakdown, and the monthly gross-cost trend.
export const GET = withGates(
  { action: "analytics.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const sinceStr = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString().slice(0, 10)

    const rows = await db
      .select({
        type: payrollRuns.type,
        status: payrollRuns.status,
        totalGross: payrollRuns.totalGross,
        netPaid: payrollRuns.netPaid,
        employeeCount: payrollRuns.employeeCount,
        periodEnd: payrollRuns.periodEnd,
      })
      .from(payrollRuns)
      .where(
        and(eq(payrollRuns.companyId, ctx.session.companyId), gte(payrollRuns.periodEnd, sinceStr))
      )

    const cost = computePayrollCost(
      rows.map((r) => ({
        type: r.type as PayrollType,
        status: r.status as PayrollStatus,
        totalGross: Number(r.totalGross ?? 0),
        netPaid: Number(r.netPaid ?? 0),
        employeeCount: r.employeeCount ?? 0,
        periodEnd: String(r.periodEnd),
      })),
      Date.now(),
      6
    )

    return NextResponse.json(cost)
  }
)
