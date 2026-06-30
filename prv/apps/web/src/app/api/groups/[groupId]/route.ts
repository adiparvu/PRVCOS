import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import { db } from "@prv/db"
import { companyGroups, groupMemberships, companies } from "@prv/db/schema"
import { eq, and, asc, isNull, notInArray } from "drizzle-orm"
import { hasScope, writeAuditLog } from "@prv/auth"
import { queryGroupKpis } from "@prv/db/queries/group-kpis"
import type { GateContext } from "@prv/auth"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const GROUP_ADMIN_ROLES = new Set(["group_ceo", "ceo", "system_administrator"] as const)

// GET /api/groups/[groupId] — group details, member companies, live KPIs, and
// the companies still eligible to be added (active, not already members).
export const GET = withGates(
  {
    action: "groups.read",
    endpointClass: "api_read",
    requiredRoles: GROUP_ADMIN_ROLES,
    requiredScope: "SCOPE_GROUP",
  },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const groupId = _req.nextUrl.pathname.split("/").at(-1)!

    const [membership] = await db
      .select({ id: groupMemberships.id })
      .from(groupMemberships)
      .where(
        and(
          eq(groupMemberships.groupId, groupId),
          eq(groupMemberships.companyId, ctx.session.companyId),
          eq(groupMemberships.isActive, true)
        )
      )
      .limit(1)

    const isPlatformAdmin = hasScope(ctx.session.scopeLevel, "SCOPE_PLATFORM")
    if (!membership && !isPlatformAdmin) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    const [group] = await db
      .select()
      .from(companyGroups)
      .where(and(eq(companyGroups.id, groupId), eq(companyGroups.isActive, true)))
      .limit(1)

    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 })

    const memberRows = await db
      .select({
        companyId: groupMemberships.companyId,
        companyName: companies.name,
        isActive: groupMemberships.isActive,
        joinedAt: groupMemberships.joinedAt,
      })
      .from(groupMemberships)
      .innerJoin(companies, eq(groupMemberships.companyId, companies.id))
      .where(eq(groupMemberships.groupId, groupId))

    const memberIds = memberRows.map((m) => m.companyId)

    // Active companies not yet in the group — candidates for the add sheet.
    const eligibleCompanies = await db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(
        and(
          eq(companies.isActive, true),
          isNull(companies.deletedAt),
          memberIds.length > 0 ? notInArray(companies.id, memberIds) : undefined
        )
      )
      .orderBy(asc(companies.name))
      .limit(50)

    const kpis = await queryGroupKpis(groupId, ctx.session.userId)

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        slug: group.slug,
        description: group.description,
        logoUrl: group.logoUrl,
        createdAt: group.createdAt,
      },
      members: memberRows,
      eligibleCompanies,
      kpis,
    })
  }
)

// PATCH /api/groups/[groupId] — rename / re-describe the group.
const patchSchema = z
  .object({
    name: z.string().min(2).max(255).optional(),
    description: z.string().max(1000).nullable().optional(),
  })
  .refine((d) => d.name !== undefined || d.description !== undefined, {
    message: "Provide name and/or description",
  })

export const PATCH = withGates(
  {
    action: "groups.update",
    endpointClass: "api_write",
    requiredRoles: GROUP_ADMIN_ROLES,
    requiredScope: "SCOPE_GROUP",
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const groupId = req.nextUrl.pathname.split("/").at(-1)!

    const [membership] = await db
      .select({ id: groupMemberships.id })
      .from(groupMemberships)
      .where(
        and(
          eq(groupMemberships.groupId, groupId),
          eq(groupMemberships.companyId, ctx.session.companyId),
          eq(groupMemberships.isActive, true)
        )
      )
      .limit(1)

    if (!membership && !hasScope(ctx.session.scopeLevel, "SCOPE_PLATFORM")) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const patch: { name?: string; description?: string | null; updatedAt: Date } = {
      updatedAt: new Date(),
    }
    if (parsed.data.name !== undefined) patch.name = parsed.data.name
    if (parsed.data.description !== undefined) patch.description = parsed.data.description

    const [updated] = await db
      .update(companyGroups)
      .set(patch)
      .where(and(eq(companyGroups.id, groupId), eq(companyGroups.isActive, true)))
      .returning({
        id: companyGroups.id,
        name: companyGroups.name,
        description: companyGroups.description,
      })

    if (!updated) return NextResponse.json({ error: "Group not found" }, { status: 404 })

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "groups.update",
      entityType: "company_group",
      entityId: groupId,
      payload: parsed.data,
      method: "PATCH",
      path: `/api/groups/${groupId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ group: updated })
  }
)
