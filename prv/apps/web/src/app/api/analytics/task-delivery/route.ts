import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { projectTasks } from "@prv/db/schema"
import { eq } from "drizzle-orm"
import {
  computeTaskDelivery,
  type TaskDelivery,
  type TaskStatus,
  type TaskPriority,
} from "@/lib/task-delivery"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type TaskDeliveryResponse = TaskDelivery

// GET /api/analytics/task-delivery — project task delivery health: status mix,
// completion rate, overdue backlog, on-time rate, open work by priority.
export const GET = withGates(
  { action: "analytics.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select({
        status: projectTasks.status,
        priority: projectTasks.priority,
        dueDate: projectTasks.dueDate,
        completedAt: projectTasks.completedAt,
      })
      .from(projectTasks)
      .where(eq(projectTasks.companyId, ctx.session.companyId))

    const delivery = computeTaskDelivery(
      rows.map((r) => ({
        status: r.status as TaskStatus,
        priority: r.priority as TaskPriority,
        dueDate: r.dueDate ? String(r.dueDate) : null,
        completedAt: r.completedAt ? r.completedAt.toISOString() : null,
      })),
      Date.now()
    )

    return NextResponse.json(delivery)
  }
)
