import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { inspectionTemplates } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { normalizeChecklistItems } from "@/lib/inspection-checklist"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function tid(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").pop() ?? ""
}

const patchSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    items: z.array(z.unknown()).max(100).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "At least one field required" })

export const PATCH = withGates(
  { action: "safety.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = tid(req)
    const parsed = patchSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )

    const [existing] = await db
      .select({ id: inspectionTemplates.id })
      .from(inspectionTemplates)
      .where(and(eq(inspectionTemplates.id, id), eq(inspectionTemplates.companyId, companyId)))
      .limit(1)
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const d = parsed.data
    let items: ReturnType<typeof normalizeChecklistItems> | undefined
    if (d.items !== undefined) {
      items = normalizeChecklistItems(d.items)
      if (items.length === 0)
        return NextResponse.json({ error: "At least one valid item is required" }, { status: 422 })
    }

    const [updated] = await db
      .update(inspectionTemplates)
      .set({
        ...(d.name !== undefined && { name: d.name }),
        ...(d.description !== undefined && { description: d.description }),
        ...(items !== undefined && { items }),
        updatedAt: new Date(),
      })
      .where(and(eq(inspectionTemplates.id, id), eq(inspectionTemplates.companyId, companyId)))
      .returning({ id: inspectionTemplates.id })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "safety.inspection_template.update",
      entityType: "inspection_template",
      entityId: id,
      payload: { changes: Object.keys(d) },
      method: "PATCH",
      path: `/api/safety/inspection-templates/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

export const DELETE = withGates(
  { action: "safety.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = tid(req)

    const [existing] = await db
      .select({ id: inspectionTemplates.id, name: inspectionTemplates.name })
      .from(inspectionTemplates)
      .where(and(eq(inspectionTemplates.id, id), eq(inspectionTemplates.companyId, companyId)))
      .limit(1)
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db
      .delete(inspectionTemplates)
      .where(and(eq(inspectionTemplates.id, id), eq(inspectionTemplates.companyId, companyId)))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "safety.inspection_template.delete",
      entityType: "inspection_template",
      entityId: id,
      payload: { name: existing.name },
      method: "DELETE",
      path: `/api/safety/inspection-templates/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
