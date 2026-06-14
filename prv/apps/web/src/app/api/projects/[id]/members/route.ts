import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { projects, projectMembers, users } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function pid(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}

async function verifyProject(id: string, companyId: string) {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.companyId, companyId), isNull(projects.deletedAt)))
    .limit(1)
  return row ?? null
}

// ─── GET /api/projects/[id]/members ──────────────────────────────────────────

export const GET = withGates(
  { action: "projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = pid(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const project = await verifyProject(id, ctx.session.companyId)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const rows = await db
      .select({
        id: projectMembers.id,
        userId: projectMembers.userId,
        role: projectMembers.role,
        joinedAt: projectMembers.joinedAt,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        jobTitle: users.jobTitle,
        avatarUrl: users.avatarUrl,
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, id))

    return NextResponse.json({
      members: rows.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
        name: `${m.firstName} ${m.lastName}`,
        email: m.email,
        jobTitle: m.jobTitle,
        avatarUrl: m.avatarUrl,
      })),
    })
  }
)

// ─── POST /api/projects/[id]/members ─────────────────────────────────────────

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["owner", "manager", "worker", "observer"]).default("worker"),
})

export const POST = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = pid(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId, sessionId } = ctx.session

    const project = await verifyProject(id, companyId)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = addMemberSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    const [record] = await db
      .insert(projectMembers)
      .values({ projectId: id, userId: parsed.data.userId, role: parsed.data.role })
      .onConflictDoUpdate({
        target: [projectMembers.projectId, projectMembers.userId],
        set: { role: parsed.data.role },
      })
      .returning({ id: projectMembers.id, role: projectMembers.role })

    void writeAuditLog({
      companyId,
      actorId: actorId,
      sessionId,
      action: "projects.member.add",
      entityType: "project",
      entityId: id,
      payload: parsed.data,
      method: "POST",
      path: `/api/projects/${id}/members`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(record, { status: 201 })
  }
)
