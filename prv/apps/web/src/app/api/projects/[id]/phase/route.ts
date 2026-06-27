import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { projects } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({
  action: z.enum(["advance", "revert"]),
  note: z.string().max(500).optional(),
})

// draft → active → completed
const ADVANCE: Record<string, string> = { draft: "active", active: "completed" }
const REVERT: Record<string, string> = { completed: "active", active: "draft" }

export const POST = withGates(
  { action: "projects.phase.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").at(-2) ?? ""
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const raw = await req.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

    const { action, note } = parsed.data
    const { userId, companyId, sessionId } = ctx.session

    const [project] = await db
      .select({ id: projects.id, status: projects.status })
      .from(projects)
      .where(
        and(eq(projects.id, id), eq(projects.companyId, companyId), isNull(projects.deletedAt))
      )
      .limit(1)

    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const transitions = action === "advance" ? ADVANCE : REVERT
    const nextStatus = transitions[project.status]

    if (!nextStatus) {
      return NextResponse.json(
        { error: `Cannot ${action} project from status '${project.status}'` },
        { status: 409 }
      )
    }

    const extra = nextStatus === "completed" ? { completedAt: new Date() } : {}

    await db
      .update(projects)
      .set({ status: nextStatus as typeof project.status, updatedAt: new Date(), ...extra })
      .where(and(eq(projects.id, id), eq(projects.companyId, companyId)))

    void writeAuditLog({
      actorId: userId,
      companyId,
      sessionId,
      action: `projects.phase.${action}`,
      entityType: "project",
      entityId: id,
      payload: { from: project.status, to: nextStatus, note: note ?? null },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ success: true, id, action, from: project.status, to: nextStatus })
  }
)
