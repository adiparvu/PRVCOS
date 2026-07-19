import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { taskTimeEntries, projectTasks } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// GET /api/me/running-timer — the current user's single running time entry (if
// any), so any task view can reflect a live timer without per-task polling.
export const GET = withGates(
  { action: "projects.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session

    const [running] = await db
      .select({
        entryId: taskTimeEntries.id,
        taskId: taskTimeEntries.taskId,
        startedAt: taskTimeEntries.startedAt,
        taskTitle: projectTasks.title,
        projectId: projectTasks.projectId,
      })
      .from(taskTimeEntries)
      .leftJoin(projectTasks, eq(taskTimeEntries.taskId, projectTasks.id))
      .where(
        and(
          eq(taskTimeEntries.userId, userId),
          eq(taskTimeEntries.companyId, companyId),
          isNull(taskTimeEntries.endedAt)
        )
      )
      .limit(1)

    return NextResponse.json({
      running: running
        ? {
            entryId: running.entryId,
            taskId: running.taskId,
            projectId: running.projectId,
            taskTitle: running.taskTitle,
            startedAt: running.startedAt.toISOString(),
          }
        : null,
    })
  }
)
