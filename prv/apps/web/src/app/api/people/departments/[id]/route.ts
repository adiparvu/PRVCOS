import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { departments, teams, users } from "@prv/db/schema"
import { and, count, eq } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function getId(req: NextRequest): string | null {
  const parts = req.nextUrl.pathname.split("/")
  return parts[parts.length - 1] ?? null
}

// ── GET /api/people/departments/[id] ─────────────────────────────────────────

export const GET = withGates(
  { action: "hr.departments.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = getId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId } = ctx.session

    const [row] = await db
      .select({
        id: departments.id,
        name: departments.name,
        code: departments.code,
        parentId: departments.parentId,
        headUserId: departments.headUserId,
        isActive: departments.isActive,
        createdAt: departments.createdAt,
        updatedAt: departments.updatedAt,
      })
      .from(departments)
      .where(and(eq(departments.id, id), eq(departments.companyId, companyId)))
      .limit(1)

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Enrich: parent name, head user name, team count
    const [parentRow, headRow, [teamCount]] = await Promise.all([
      row.parentId
        ? db
            .select({ id: departments.id, name: departments.name })
            .from(departments)
            .where(eq(departments.id, row.parentId))
            .limit(1)
        : Promise.resolve([] as { id: string; name: string }[]),

      row.headUserId
        ? db
            .select({ firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(eq(users.id, row.headUserId))
            .limit(1)
        : Promise.resolve([] as { firstName: string; lastName: string }[]),

      db
        .select({ cnt: count() })
        .from(teams)
        .where(and(eq(teams.departmentId, id), eq(teams.isActive, true))),
    ])

    return NextResponse.json({
      department: {
        ...row,
        parentName: parentRow[0]?.name ?? null,
        headUserName: headRow[0]
          ? `${headRow[0].firstName} ${headRow[0].lastName}`
          : null,
        teamCount: teamCount?.cnt ?? 0,
      },
    })
  }
)

// ── PATCH /api/people/departments/[id] ────────────────────────────────────────

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  code: z.string().min(1).max(50).optional(),
  parentId: z.string().uuid().nullable().optional(),
  headUserId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
})

export const PATCH = withGates(
  { action: "hr.departments.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = getId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { userId, companyId, sessionId } = ctx.session

    const [existing] = await db
      .select({ id: departments.id })
      .from(departments)
      .where(and(eq(departments.id, id), eq(departments.companyId, companyId)))
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const raw = await req.json().catch(() => ({}))
    const parsed = patchSchema.safeParse(raw)
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 422 })

    const { parentId, ...rest } = parsed.data

    // Prevent self-referential parent
    if (parentId === id)
      return NextResponse.json({ error: "A department cannot be its own parent" }, { status: 422 })

    // Validate parentId belongs to same company and is active
    if (parentId) {
      const [parent] = await db
        .select({ id: departments.id })
        .from(departments)
        .where(and(eq(departments.id, parentId), eq(departments.companyId, companyId), eq(departments.isActive, true)))
        .limit(1)
      if (!parent) return NextResponse.json({ error: "Parent department not found" }, { status: 404 })
    }

    const updates = {
      ...rest,
      ...(parentId !== undefined ? { parentId: parentId ?? null } : {}),
      updatedAt: new Date(),
    }

    const [updated] = await db
      .update(departments)
      .set(updates)
      .where(and(eq(departments.id, id), eq(departments.companyId, companyId)))
      .returning({ id: departments.id, name: departments.name, code: departments.code })

    void writeAuditLog({
      actorId: userId,
      companyId,
      sessionId,
      action: "hr.department.update",
      entityType: "department",
      entityId: id,
      payload: parsed.data,
      method: "PATCH",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

// ── DELETE /api/people/departments/[id] ──────────────────────────────────────
// Soft-deactivate. Blocks if department has active sub-departments or teams.

export const DELETE = withGates(
  { action: "hr.departments.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = getId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { userId, companyId, sessionId } = ctx.session

    const [existing] = await db
      .select({ id: departments.id, isActive: departments.isActive })
      .from(departments)
      .where(and(eq(departments.id, id), eq(departments.companyId, companyId)))
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (!existing.isActive)
      return NextResponse.json({ error: "Department is already inactive" }, { status: 409 })

    // Block if active sub-departments exist
    const [subDepts] = await db
      .select({ cnt: count() })
      .from(departments)
      .where(and(eq(departments.parentId, id), eq(departments.isActive, true)))

    if ((subDepts?.cnt ?? 0) > 0)
      return NextResponse.json(
        { error: "Cannot deactivate: department has active sub-departments" },
        { status: 409 }
      )

    // Block if active teams exist
    const [activeTeams] = await db
      .select({ cnt: count() })
      .from(teams)
      .where(and(eq(teams.departmentId, id), eq(teams.isActive, true)))

    if ((activeTeams?.cnt ?? 0) > 0)
      return NextResponse.json(
        { error: "Cannot deactivate: department has active teams" },
        { status: 409 }
      )

    await db
      .update(departments)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(departments.id, id), eq(departments.companyId, companyId)))

    void writeAuditLog({
      actorId: userId,
      companyId,
      sessionId,
      action: "hr.department.deactivate",
      entityType: "department",
      entityId: id,
      payload: {},
      method: "DELETE",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
