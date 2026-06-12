import { withGates } from "@/lib/with-gates"
import { writeAuditLog } from "@prv/auth"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { payrollRuns } from "@prv/db/schema"
import type { PayrollRunStatus, PayrollRunType } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MONTH_LABELS = [
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
] as const

function buildSubtitle(employeeCount: number, periodStart: string, periodEnd: string): string {
  const fmt = (d: string) => {
    const dt = new Date(d + "T12:00:00Z")
    return `${dt.getUTCDate()} ${MONTH_LABELS[dt.getUTCMonth()]}`
  }
  return `${employeeCount} employees · ${fmt(periodStart)}–${fmt(periodEnd)}`
}

function buildPeriod(periodStart: string, periodEnd: string): string {
  const fmt = (d: string) => {
    const dt = new Date(d + "T12:00:00Z")
    return `${dt.getUTCDate()} ${MONTH_LABELS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`
  }
  return `${fmt(periodStart)}–${fmt(periodEnd)}`
}

export const POST = withGates(
  { action: "payroll.runs.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const body = await req.json()
    const { runType, startDate, endDate, notes, status } = body

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 })
    }

    const { companyId, userId } = ctx.session
    const ref = `PR-${Date.now()}`
    const title = `Payroll Run ${buildPeriod(startDate, endDate)}`

    const [inserted] = await db
      .insert(payrollRuns)
      .values({
        companyId,
        ref,
        title,
        periodStart: startDate,
        periodEnd: endDate,
        status: (status ?? "pending") as PayrollRunStatus,
        type: (runType ?? "weekly") as PayrollRunType,
        notes: notes ?? null,
        employeeCount: 0,
        totalGross: "0",
        netPaid: "0",
      })
      .returning()

    if (!inserted) return NextResponse.json({ error: "Database error" }, { status: 500 })

    await writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "payroll.runs.create",
      entityType: "payroll_run",
      entityId: inserted.id,
      payload: {
        ref: inserted.ref,
        runType: inserted.type,
        startDate,
        endDate,
        status: inserted.status,
      },
    })

    const run = {
      id: inserted.id,
      ref: inserted.ref,
      title: inserted.title,
      subtitle: buildSubtitle(0, startDate, endDate),
      period: buildPeriod(startDate, endDate),
      employeeCount: inserted.employeeCount,
      totalGross: Number(inserted.totalGross),
      netPaid: Number(inserted.netPaid),
      status: inserted.status as PayrollRunStatus,
      type: inserted.type as PayrollRunType,
    }

    return NextResponse.json({ run }, { status: 201 })
  }
)
