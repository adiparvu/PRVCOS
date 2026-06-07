import { withGates } from "@/lib/with-gates"
import { writeAuditLog } from "@prv/auth"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = withGates(
  { action: "payroll.runs.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const body = await req.json()
    const { runType, startDate, endDate, notes, status } = body

    const runId = `pr-${Date.now()}`
    const refNumber = `PR-${String(Date.now()).slice(-4)}`

    const newRun = {
      id: runId,
      ref: refNumber,
      runType: runType ?? "weekly",
      startDate,
      endDate,
      notes: notes ?? "",
      status: status ?? "pending",
      employeeCount: 142,
      totalGross: 28400,
      netPaid: 16614,
      createdAt: new Date().toISOString(),
    }

    await writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "payroll.runs.create",
      entityType: "payroll_run",
      entityId: runId,
      payload: {
        runType: newRun.runType,
        startDate,
        endDate,
        status: newRun.status,
        employeeCount: 142,
      },
    })

    return NextResponse.json({ run: newRun }, { status: 201 })
  }
)
