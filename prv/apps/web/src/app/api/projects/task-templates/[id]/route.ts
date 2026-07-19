import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { taskTemplates } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { normalizeTemplateItems } from "@/lib/task-template"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function templateId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").pop() ?? ""
}

const patchSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    items: z.array(z.unknown()).max(100).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "At least one field required" })

// ─── PATCH /api/projects/task-templates/[id] ──────────────────────────────────
export const PATCH = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = templateId(req)
    const parsed = patchSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )

    const [existing] = await db
      .select({ id: taskTemplates.id })
      .from(taskTemplates)
      .where(and(eq(taskTemplates.id, id), eq(taskTemplates.companyId, companyId)))
      .limit(1)
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const d = parsed.data
    let items: ReturnType<typeof normalizeTemplateItems> | undefined
    if (d.items !== undefined) {
      items = normalizeTemplateItems(d.items)
      if (items.length === 0)
        return NextResponse.json({ error: "At least one valid item is required" }, { status: 422 })
    }

    const [updated] = await db
      .update(taskTemplates)
      .set({
        ...(d.name !== undefined && { name: d.name }),
        ...(d.description !== undefined && { description: d.description }),
        ...(items !== undefined && { items }),
        updatedAt: new Date(),
      })
      .where(and(eq(taskTemplates.id, id), eq(taskTemplates.companyId, companyId)))
      .returning({ id: taskTemplates.id })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "projects.task_template.update",
      entityType: "task_template",
      entityId: id,
      payload: { changes: Object.keys(d) },
      method: "PATCH",
      path: `/api/projects/task-templates/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

// ─── DELETE /api/projects/task-templates/[id] ─────────────────────────────────
export const DELETE = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = templateId(req)

    const [existing] = await db
      .select({ id: taskTemplates.id, name: taskTemplates.name })
      .from(taskTemplates)
      .where(and(eq(taskTemplates.id, id), eq(taskTemplates.companyId, companyId)))
      .limit(1)
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db
      .delete(taskTemplates)
      .where(and(eq(taskTemplates.id, id), eq(taskTemplates.companyId, companyId)))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "projects.task_template.delete",
      entityType: "task_template",
      entityId: id,
      payload: { name: existing.name },
      method: "DELETE",
      path: `/api/projects/task-templates/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
