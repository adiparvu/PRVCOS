import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { teams, departments, stores, users } from "@prv/db/schema"
import { and, count, eq } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function getId(req: NextRequest): string | null {
  const parts = req.nextUrl.pathname.split("/")
  return parts[parts.length - 1] ?? null
}

// ── GET /api/people/teams/[id] ────────────────────────────────────────────────

export const GET = withGates(
  { action: "hr.teams.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = getId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId } = ctx.session

    const [row] = await db
      .select({
        id: teams.id,
        name: teams.name,
        code: teams.code,
        departmentId: teams.departmentId,
        departmentName: departments.name,
        storeId: teams.storeId,
        storeName: stores.name,
        leadUserId: teams.leadUserId,
        isActive: teams.isActive,
        createdAt: teams.createdAt,
        updatedAt: teams.updatedAt,
      })
      .from(teams)
      .leftJoin(departments, eq(teams.departmentId, departments.id))
      .leftJoin(stores, eq(teams.storeId, stores.id))
      .where(and(eq(teams.id, id), eq(teams.companyId, companyId)))
      .limit(1)

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Enrich: lead user name, member count
    const [leadRow, [memberCount]] = await Promise.all([
      row.leadUserId
        ? db
            .select({ firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(eq(users.id, row.leadUserId))
            .limit(1)
        : Promise.resolve([] as { firstName: string; lastName: string }[]),

      db
        .select({ cnt: count() })
        .from(users)
        .where(and(eq(users.teamId, id), eq(users.isActive, true))),
    ])

    return NextResponse.json({
      team: {
        ...row,
        leadUserName: leadRow[0]
          ? `${leadRow[0].firstName} ${leadRow[0].lastName}`
          : null,
        memberCount: memberCount?.cnt ?? 0,
      },
    })
  }
)

// ── PATCH /api/people/teams/[id] ──────────────────────────────────────────────

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  code: z.string().min(1).max(50).optional(),
  departmentId: z.string().uuid().nullable().optional(),
  storeId: z.string().uuid().nullable().optional(),
  leadUserId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
})

export const PATCH = withGates(
  { action: "hr.teams.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = getId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { userId, companyId, sessionId } = ctx.session

    const [existing] = await db
      .select({ id: teams.id })
      .from(teams)
      .where(and(eq(teams.id, id), eq(teams.companyId, companyId)))
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const raw = await req.json().catch(() => ({}))
    const parsed = patchSchema.safeParse(raw)
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 422 })

    const { departmentId, storeId, ...rest } = parsed.data

    // Validate departmentId belongs to same company
    if (departmentId) {
      const [dept] = await db
        .select({ id: departments.id })
        .from(departments)
        .where(and(eq(departments.id, departmentId), eq(departments.companyId, companyId), eq(departments.isActive, true)))
        .limit(1)
      if (!dept) return NextResponse.json({ error: "Department not found" }, { status: 404 })
    }

    // Validate storeId belongs to same company
    if (storeId) {
      const [store] = await db
        .select({ id: stores.id })
        .from(stores)
        .where(and(eq(stores.id, storeId), eq(stores.companyId, companyId)))
        .limit(1)
      if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 })
    }

    const updates = {
      ...rest,
      ...(departmentId !== undefined ? { departmentId: departmentId ?? null } : {}),
      ...(storeId !== undefined ? { storeId: storeId ?? null } : {}),
      updatedAt: new Date(),
    }

    const [updated] = await db
      .update(teams)
      .set(updates)
      .where(and(eq(teams.id, id), eq(teams.companyId, companyId)))
      .returning({ id: teams.id, name: teams.name, code: teams.code })

    void writeAuditLog({
      actorId: userId,
      companyId,
      sessionId,
      action: "hr.team.update",
      entityType: "team",
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

// ── DELETE /api/people/teams/[id] ─────────────────────────────────────────────
// Soft-deactivate. Blocks if team still has active members.

export const DELETE = withGates(
  { action: "hr.teams.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = getId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { userId, companyId, sessionId } = ctx.session

    const [existing] = await db
      .select({ id: teams.id, isActive: teams.isActive })
      .from(teams)
      .where(and(eq(teams.id, id), eq(teams.companyId, companyId)))
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (!existing.isActive)
      return NextResponse.json({ error: "Team is already inactive" }, { status: 409 })

    // Block if team has active members
    const [memberRow] = await db
      .select({ cnt: count() })
      .from(users)
      .where(and(eq(users.teamId, id), eq(users.isActive, true)))

    if ((memberRow?.cnt ?? 0) > 0)
      return NextResponse.json(
        { error: "Cannot deactivate: team has active members" },
        { status: 409 }
      )

    await db
      .update(teams)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(teams.id, id), eq(teams.companyId, companyId)))

    void writeAuditLog({
      actorId: userId,
      companyId,
      sessionId,
      action: "hr.team.deactivate",
      entityType: "team",
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
