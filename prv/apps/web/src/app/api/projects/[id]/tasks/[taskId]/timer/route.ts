import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { projectTasks, taskTimeEntries, users } from "@prv/db/schema"
import { and, desc, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { addHoursFromMinutes, canStartTimer, computeDurationMinutes } from "@/lib/task-timer"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface TaskTimeEntryDto {
  id: string
  userId: string
  userName: string | null
  startedAt: string
  endedAt: string | null
  durationMinutes: number | null
  note: string | null
  running: boolean
}

function ids(req: NextRequest): { projectId: string; taskId: string } {
  const parts = req.nextUrl.pathname.split("/")
  const pi = parts.indexOf("projects")
  const ti = parts.indexOf("tasks")
  return {
    projectId: pi >= 0 ? (parts[pi + 1] ?? "") : "",
    taskId: ti >= 0 ? (parts[ti + 1] ?? "") : "",
  }
}

async function loadTask(taskId: string, projectId: string, companyId: string) {
  const [t] = await db
    .select({ id: projectTasks.id, actualHours: projectTasks.actualHours })
    .from(projectTasks)
    .where(
      and(
        eq(projectTasks.id, taskId),
        eq(projectTasks.projectId, projectId),
        eq(projectTasks.companyId, companyId)
      )
    )
    .limit(1)
  return t ?? null
}

// ─── GET .../timer ────────────────────────────────────────────────────────────
// This task's entries (newest first) plus whether the current user has a running
// timer anywhere (so the UI can warn before starting another).
export const GET = withGates(
  { action: "projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const { projectId, taskId } = ids(req)

    if (!(await loadTask(taskId, projectId, companyId)))
      return NextResponse.json({ error: "Task not found" }, { status: 404 })

    const [rows, runningAnywhere] = await Promise.all([
      db
        .select({
          id: taskTimeEntries.id,
          userId: taskTimeEntries.userId,
          startedAt: taskTimeEntries.startedAt,
          endedAt: taskTimeEntries.endedAt,
          durationMinutes: taskTimeEntries.durationMinutes,
          note: taskTimeEntries.note,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(taskTimeEntries)
        .leftJoin(users, eq(taskTimeEntries.userId, users.id))
        .where(eq(taskTimeEntries.taskId, taskId))
        .orderBy(desc(taskTimeEntries.startedAt))
        .limit(50),
      db
        .select({ id: taskTimeEntries.id, taskId: taskTimeEntries.taskId })
        .from(taskTimeEntries)
        .where(
          and(
            eq(taskTimeEntries.userId, userId),
            eq(taskTimeEntries.companyId, companyId),
            isNull(taskTimeEntries.endedAt)
          )
        )
        .limit(1),
    ])

    const entries: TaskTimeEntryDto[] = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.firstName && r.lastName ? `${r.firstName} ${r.lastName}` : null,
      startedAt: r.startedAt.toISOString(),
      endedAt: r.endedAt?.toISOString() ?? null,
      durationMinutes: r.durationMinutes,
      note: r.note,
      running: r.endedAt === null,
    }))

    const running = runningAnywhere[0] ?? null
    return NextResponse.json({
      entries,
      running: running ? { entryId: running.id, taskId: running.taskId } : null,
    })
  }
)

// ─── POST .../timer ───────────────────────────────────────────────────────────
const bodySchema = z.object({
  op: z.enum(["start", "stop"]),
  note: z.string().max(500).optional(),
})

export const POST = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const { projectId, taskId } = ids(req)

    const task = await loadTask(taskId, projectId, companyId)
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 })

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 422 })

    // The user's currently running entry (across any task), if any.
    const [running] = await db
      .select({
        id: taskTimeEntries.id,
        taskId: taskTimeEntries.taskId,
        startedAt: taskTimeEntries.startedAt,
      })
      .from(taskTimeEntries)
      .where(
        and(
          eq(taskTimeEntries.userId, userId),
          eq(taskTimeEntries.companyId, companyId),
          isNull(taskTimeEntries.endedAt)
        )
      )
      .limit(1)

    if (parsed.data.op === "start") {
      const gate = canStartTimer(!!running)
      if (!gate.ok)
        return NextResponse.json(
          { error: gate.reason, runningTaskId: running?.taskId ?? null },
          { status: 409 }
        )

      const [entry] = await db
        .insert(taskTimeEntries)
        .values({ companyId, taskId, userId, note: parsed.data.note ?? null })
        .returning({ id: taskTimeEntries.id, startedAt: taskTimeEntries.startedAt })

      void writeAuditLog({
        companyId,
        actorId: userId,
        sessionId: ctx.session.sessionId,
        action: "projects.task.timer.start",
        entityType: "task_time_entry",
        entityId: entry!.id,
        payload: { taskId },
        method: "POST",
        path: req.nextUrl.pathname,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      })

      return NextResponse.json(
        { running: true, entryId: entry!.id, startedAt: entry!.startedAt.toISOString() },
        { status: 201 }
      )
    }

    // op === "stop": stop the running entry, but only if it belongs to THIS task.
    if (!running || running.taskId !== taskId)
      return NextResponse.json({ error: "No running timer on this task" }, { status: 409 })

    const now = new Date()
    const duration = computeDurationMinutes(running.startedAt, now)

    await db
      .update(taskTimeEntries)
      .set({ endedAt: now, durationMinutes: duration })
      .where(eq(taskTimeEntries.id, running.id))

    // Roll the tracked time into the task's actualHours (additive).
    const newActual = addHoursFromMinutes(task.actualHours, duration)
    await db
      .update(projectTasks)
      .set({ actualHours: newActual, updatedAt: now })
      .where(and(eq(projectTasks.id, taskId), eq(projectTasks.companyId, companyId)))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "projects.task.timer.stop",
      entityType: "task_time_entry",
      entityId: running.id,
      payload: { taskId, durationMinutes: duration, actualHours: newActual },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ running: false, durationMinutes: duration, actualHours: newActual })
  }
)
