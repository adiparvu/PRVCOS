import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { projects, projectMembers } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function extractIds(req: NextRequest) {
  const parts = req.nextUrl.pathname.split("/")
  return { pid: parts.at(-3) ?? "", memberId: parts.at(-1) ?? "" }
}

// ─── PATCH /api/projects/[id]/members/[memberId] ─────────────────────────────

const patchSchema = z.object({
  role: z.enum(["owner", "manager", "worker", "observer"]),
})

export const PATCH = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { pid, memberId } = extractIds(req)
    if (!pid || !memberId) return NextResponse.json({ error: "Missing ids" }, { status: 400 })

    const { companyId, userId, sessionId } = ctx.session

    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(eq(projects.id, pid), eq(projects.companyId, companyId), isNull(projects.deletedAt))
      )
      .limit(1)

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    const [updated] = await db
      .update(projectMembers)
      .set({ role: parsed.data.role })
      .where(and(eq(projectMembers.id, memberId), eq(projectMembers.projectId, pid)))
      .returning({ id: projectMembers.id, role: projectMembers.role })

    if (!updated) return NextResponse.json({ error: "Member not found" }, { status: 404 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "projects.member.update",
      entityType: "project",
      entityId: pid,
      payload: { memberId, ...parsed.data },
      method: "PATCH",
      path: `/api/projects/${pid}/members/${memberId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

// ─── DELETE /api/projects/[id]/members/[memberId] ────────────────────────────

export const DELETE = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { pid, memberId } = extractIds(req)
    if (!pid || !memberId) return NextResponse.json({ error: "Missing ids" }, { status: 400 })

    const { companyId, userId, sessionId } = ctx.session

    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(eq(projects.id, pid), eq(projects.companyId, companyId), isNull(projects.deletedAt))
      )
      .limit(1)

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const [removed] = await db
      .delete(projectMembers)
      .where(and(eq(projectMembers.id, memberId), eq(projectMembers.projectId, pid)))
      .returning({ userId: projectMembers.userId })

    if (!removed) return NextResponse.json({ error: "Member not found" }, { status: 404 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "projects.member.remove",
      entityType: "project",
      entityId: pid,
      payload: { memberId, removedUserId: removed.userId },
      method: "DELETE",
      path: `/api/projects/${pid}/members/${memberId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
