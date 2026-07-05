import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { payrollItems, projectTasks, users } from "@prv/db/schema"
import { and, count, eq, isNotNull, sum } from "drizzle-orm"
import { computeEmployeeRoi, type RoiSummary } from "@/lib/employee-roi"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type EmployeeRoiResponse = RoiSummary

// GET /api/analytics/employee-roi — cross-module BI: payroll cost (HR) vs
// completed project tasks (Projects) per employee.
export const GET = withGates(
  { action: "analytics.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const companyId = ctx.session.companyId

    const [costRows, taskRows] = await Promise.all([
      db
        .select({
          userId: payrollItems.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          cost: sum(payrollItems.grossAmount),
        })
        .from(payrollItems)
        .leftJoin(users, eq(payrollItems.userId, users.id))
        .where(eq(payrollItems.companyId, companyId))
        .groupBy(payrollItems.userId, users.firstName, users.lastName),
      db
        .select({ assigneeId: projectTasks.assigneeId, cnt: count() })
        .from(projectTasks)
        .where(
          and(
            eq(projectTasks.companyId, companyId),
            eq(projectTasks.status, "done"),
            isNotNull(projectTasks.assigneeId)
          )
        )
        .groupBy(projectTasks.assigneeId),
    ])

    const tasksByUser = new Map<string, number>()
    for (const t of taskRows) {
      if (t.assigneeId) tasksByUser.set(t.assigneeId, t.cnt)
    }

    const roi = computeEmployeeRoi(
      costRows
        .filter((r) => r.userId)
        .map((r) => ({
          userId: r.userId as string,
          name: r.firstName ? `${r.firstName} ${r.lastName ?? ""}`.trim() : "Unknown",
          payrollCost: Number(r.cost ?? 0),
          tasksCompleted: tasksByUser.get(r.userId as string) ?? 0,
        }))
    )

    return NextResponse.json(roi)
  }
)
