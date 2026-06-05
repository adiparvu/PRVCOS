import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import { db } from "@prv/db"
import { companyGroups, groupMemberships, companies } from "@prv/db/schema"
import { eq, and } from "drizzle-orm"
import { RoleSets, hasScope } from "@prv/auth"
import { queryGroupKpis } from "@prv/db/queries/group-kpis"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// GET /api/groups/[groupId] — group details with member companies and live KPIs
export const GET = withGates(
  {
    action: "groups.read",
    endpointClass: "api_read",
    requiredRoles: new Set(["group_ceo", "ceo", "system_administrator"] as const),
    requiredScope: "SCOPE_GROUP",
  },
  async (
    _req: NextRequest,
    ctx: GateContext,
    { params }: { params: Promise<{ groupId: string }> }
  ): Promise<NextResponse> => {
    const { groupId } = await params

    // Verify the session's company is a member of this group
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
      kpis,
    })
  }
)
