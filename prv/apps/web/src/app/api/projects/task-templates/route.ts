import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { taskTemplates } from "@prv/db/schema"
import { desc, eq } from "drizzle-orm"
import { z } from "zod"
import { normalizeTemplateItems, type TaskTemplateItem } from "@/lib/task-template"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface TaskTemplateDto {
  id: string
  name: string
  description: string | null
  items: TaskTemplateItem[]
  itemCount: number
  createdAt: string
}

function toDto(r: typeof taskTemplates.$inferSelect): TaskTemplateDto {
  const items = normalizeTemplateItems(r.items)
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    items,
    itemCount: items.length,
    createdAt: r.createdAt.toISOString(),
  }
}

// ─── GET /api/projects/task-templates ─────────────────────────────────────────
export const GET = withGates(
  { action: "projects.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.companyId, ctx.session.companyId))
      .orderBy(desc(taskTemplates.createdAt))
      .limit(100)
    return NextResponse.json({ templates: rows.map(toDto) })
  }
)

// ─── POST /api/projects/task-templates ────────────────────────────────────────
const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  items: z.array(z.unknown()).max(100),
})

export const POST = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const parsed = createSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )

    const items = normalizeTemplateItems(parsed.data.items)
    if (items.length === 0)
      return NextResponse.json({ error: "At least one valid item is required" }, { status: 422 })

    const [created] = await db
      .insert(taskTemplates)
      .values({
        companyId,
        createdByUserId: userId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        items,
      })
      .returning()

    if (!created) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "projects.task_template.create",
      entityType: "task_template",
      entityId: created.id,
      payload: { name: created.name, items: items.length },
      method: "POST",
      path: "/api/projects/task-templates",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(toDto(created), { status: 201 })
  }
)
