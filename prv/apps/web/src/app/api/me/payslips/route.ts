import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { payrollItems, payrollRuns } from "@prv/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { computePayslip } from "@/lib/payslip"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function n(v: string | number | null): number {
  const x = typeof v === "number" ? v : Number(v ?? 0)
  return Number.isFinite(x) ? x : 0
}

export interface MyPayslipDto {
  itemId: string
  runId: string
  periodStart: string
  periodEnd: string
  runType: string
  base: number
  overtime: number
  bonus: number
  allowance: number
  deduction: number
  gross: number
  net: number
}

// GET /api/me/payslips — the current employee's own payslips. Self-service: no
// elevated role, and the query is hard-scoped to the caller's userId + company.
// Only FINALIZED ('done') runs are exposed — a pending/processing run's figures
// may still change, so an employee never sees a non-final payslip.
export const GET = withGates(
  { action: "payroll.self.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { userId, companyId } = ctx.session

    const rows = await db
      .select({
        itemId: payrollItems.id,
        runId: payrollItems.runId,
        base: payrollItems.baseAmount,
        overtime: payrollItems.overtimeAmount,
        bonus: payrollItems.bonusAmount,
        allowance: payrollItems.allowanceAmount,
        deduction: payrollItems.deductionAmount,
        periodStart: payrollRuns.periodStart,
        periodEnd: payrollRuns.periodEnd,
        runType: payrollRuns.type,
      })
      .from(payrollItems)
      .innerJoin(payrollRuns, eq(payrollItems.runId, payrollRuns.id))
      .where(
        and(
          eq(payrollItems.userId, userId),
          eq(payrollItems.companyId, companyId),
          eq(payrollRuns.status, "done")
        )
      )
      .orderBy(desc(payrollRuns.periodEnd))
      .limit(100)

    const payslips: MyPayslipDto[] = rows.map((r) => {
      const base = n(r.base)
      const overtime = n(r.overtime)
      const bonus = n(r.bonus)
      const allowance = n(r.allowance)
      const deduction = n(r.deduction)
      // Derive gross/net from the components via the shared, tested helper so a
      // self-service payslip is always internally consistent.
      const { gross, net } = computePayslip({
        baseAmount: base,
        overtimeAmount: overtime,
        bonusAmount: bonus,
        allowanceAmount: allowance,
        deductionAmount: deduction,
      })
      return {
        itemId: r.itemId,
        runId: r.runId,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        runType: r.runType,
        base,
        overtime,
        bonus,
        allowance,
        deduction,
        gross,
        net,
      }
    })

    return NextResponse.json({ payslips })
  }
)
