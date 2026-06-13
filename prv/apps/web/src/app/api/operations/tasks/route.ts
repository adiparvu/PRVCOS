import { withGates } from "@/lib/with-gates"
import { writeAuditLog } from "@prv/auth"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { tasks } from "@prv/db/schema"
import { eq, and, isNull, desc, ilike, count } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const listSchema = z.object({
  status: z.enum(["todo", "in_progress", "done"]).optional(),
  priority: z.enum(["urgent", "medium", "low"]).optional(),
  storeId: z.string().uuid().optional(),
  assigneeUserId: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  cursor: z.string().uuid().optional(),
})

const createSchema = z.object({
  title: z.string().min(1).max(500),
  priority: z.enum(["urgent", "medium", "low"]).default("medium"),
  status: z.enum(["todo", "in_progress", "done"]).default("todo"),
  storeId: z.string().uuid().nullable().optional(),
  assigneeUserId: z.string().uuid().nullable().optional(),
  isAllStores: z.boolean().default(false),
})

// GET /api/operations/tasks — list tasks with filters and cursor pagination
export const GET = withGates(
  { action: "operations.tasks.list", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = req.nextUrl
    const parsed = listSchema.safeParse(Object.fromEntries(searchParams))
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query params" }, { status: 400 })
    }

    const { status, priority, storeId, assigneeUserId, search, limit, cursor } = parsed.data
    const { companyId } = ctx.session

    const filters = [eq(tasks.companyId, companyId), isNull(tasks.deletedAt)]

    if (status) filters.push(eq(tasks.status, status))
    if (priority) filters.push(eq(tasks.priority, priority))
    if (storeId) filters.push(eq(tasks.storeId, storeId))
    if (assigneeUserId) filters.push(eq(tasks.assigneeUserId, assigneeUserId))
    if (search) filters.push(ilike(tasks.title, `%${search}%`))

    const [rows, [totalRow]] = await Promise.all([
      db
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
        .where(and(...filters))
        .orderBy(desc(tasks.createdAt))
        .limit(limit + 1),
      db
        .select({ cnt: count() })
        .from(tasks)
        .where(and(...filters)),
    ])

    const total = totalRow?.cnt ?? 0

    // Apply cursor: skip rows until we find the cursor id, then take limit
    let sliced = rows
    if (cursor) {
      const idx = rows.findIndex((r) => r.id === cursor)
      if (idx !== -1) {
        sliced = rows.slice(idx + 1)
      }
    }

    const hasMore = sliced.length > limit
    const pageRows = hasMore ? sliced.slice(0, limit) : sliced
    const nextCursor = hasMore && pageRows.length > 0 ? pageRows[pageRows.length - 1]!.id : null

    return NextResponse.json({ tasks: pageRows, nextCursor, total })
  }
)

// POST /api/operations/tasks — create a new task
export const POST = withGates(
  { action: "operations.tasks.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const { title, priority, status, storeId, assigneeUserId, isAllStores } = parsed.data

    const [task] = await db
      .insert(tasks)
      .values({
        companyId: ctx.session.companyId,
        title,
        priority,
        status,
        storeId: storeId ?? null,
        assigneeUserId: assigneeUserId ?? null,
        isAllStores,
      })
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
      action: "operations.tasks.create",
      entityType: "task",
      entityId: task!.id,
      payload: parsed.data,
      method: "POST",
      path: "/api/operations/tasks",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ task }, { status: 201 })
  }
)
