import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { tools, toolCheckouts } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { resolveReturnedToolStatus } from "@/lib/tool-checkout"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// path: /api/tools/[id]/return
function toolId(req: NextRequest): string {
  const parts = req.nextUrl.pathname.split("/")
  const i = parts.indexOf("return")
  return i > 0 ? (parts[i - 1] ?? "") : ""
}

// ── POST /api/tools/[id]/return ───────────────────────────────────────────────
// Close the open checkout: record condition / damage and put the tool back into
// the pool — available if intact, in maintenance if damage was reported.

const returnSchema = z.object({
  conditionNotes: z.string().max(1000).optional(),
  damageReported: z.boolean().optional().default(false),
  damageNotes: z.string().max(1000).optional(),
})

export const POST = withGates(
  { action: "tools.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = toolId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId } = ctx.session

    const raw = await req.json().catch(() => ({}))
    const parsed = returnSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [tool] = await db
      .select({ id: tools.id, name: tools.name })
      .from(tools)
      .where(and(eq(tools.id, id), eq(tools.companyId, companyId), isNull(tools.deletedAt)))
      .limit(1)
    if (!tool) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const [open] = await db
      .select({ id: toolCheckouts.id })
      .from(toolCheckouts)
      .where(
        and(
          eq(toolCheckouts.toolId, id),
          eq(toolCheckouts.companyId, companyId),
          eq(toolCheckouts.status, "open")
        )
      )
      .limit(1)
    if (!open) {
      return NextResponse.json({ error: "Tool is not currently checked out" }, { status: 409 })
    }

    const { conditionNotes, damageReported, damageNotes } = parsed.data
    const toolStatus = resolveReturnedToolStatus(damageReported)

    await db
      .update(toolCheckouts)
      .set({
        status: "returned",
        returnedAt: new Date(),
        returnedBy: userId,
        returnConditionNotes: conditionNotes,
        damageReported,
        damageNotes,
        updatedAt: new Date(),
      })
      .where(eq(toolCheckouts.id, open.id))

    await db
      .update(tools)
      .set({ status: toolStatus, assignedUserId: null, updatedAt: new Date() })
      .where(and(eq(tools.id, id), eq(tools.companyId, companyId)))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "tools.return",
      entityType: "tool",
      entityId: id,
      payload: {
        name: tool.name,
        checkoutId: open.id,
        damageReported,
        toolStatus,
      },
      method: "POST",
      path: `/api/tools/${id}/return`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: open.id, toolStatus })
  }
)
