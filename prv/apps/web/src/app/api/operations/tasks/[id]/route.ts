import { withGates } from "@/lib/with-gates"
import { writeAuditLog } from "@prv/auth"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { tasks } from "@prv/db/schema"
import { eq, and, isNull } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function getTaskId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").pop()!
}

const patchSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  priority: z.enum(["urgent", "medium", "low"]).optional(),
  status: z.enum(["todo", "in_progress", "done"]).optional(),
  assigneeUserId: z.string().uuid().nullable().optional(),
  storeId: z.string().uuid().nullable().optional(),
  isAllStores: z.boolean().optional(),
})

// GET /api/operations/tasks/[id] — fetch a single task scoped by companyId
export const GET = withGates(
  { action: "operations.tasks.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = getTaskId(req)

    const [task] = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        priority: tasks.priority,
        status: tasks.status,
        storeId: tasks.storeId,
        isAllStores: tasks.isAllStores,
        assigneeUserId: tasks.assigneeUserId,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .where(
        and(eq(tasks.id, id), eq(tasks.companyId, ctx.session.companyId), isNull(tasks.deletedAt))
      )
      .limit(1)

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    return NextResponse.json({ task })
  }
)

// PATCH /api/operations/tasks/[id] — update a task
export const PATCH = withGates(
  { action: "operations.tasks.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = getTaskId(req)

    const [existing] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(eq(tasks.id, id), eq(tasks.companyId, ctx.session.companyId), isNull(tasks.deletedAt))
      )
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const [updated] = await db
      .update(tasks)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning({
        id: tasks.id,
        title: tasks.title,
        priority: tasks.priority,
        status: tasks.status,
        storeId: tasks.storeId,
        isAllStores: tasks.isAllStores,
        assigneeUserId: tasks.assigneeUserId,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "operations.tasks.update",
      entityType: "task",
      entityId: id,
      payload: parsed.data,
      method: "PATCH",
      path: `/api/operations/tasks/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ task: updated })
  }
)

// DELETE /api/operations/tasks/[id] — soft-delete a task
export const DELETE = withGates(
  { action: "operations.tasks.delete", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = getTaskId(req)

    const [existing] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(eq(tasks.id, id), eq(tasks.companyId, ctx.session.companyId), isNull(tasks.deletedAt))
      )
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    await db
      .update(tasks)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(tasks.id, id))

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "operations.tasks.delete",
      entityType: "task",
      entityId: id,
      payload: {},
      method: "DELETE",
      path: `/api/operations/tasks/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
