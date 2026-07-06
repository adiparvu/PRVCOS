import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import { db } from "@prv/db"
import { companyGroups, groupMemberships, companies, kpiDailySnapshots } from "@prv/db/schema"
import { and, desc, eq, gte, inArray } from "drizzle-orm"
import { hasScope } from "@prv/auth"
import type { GateContext } from "@prv/auth"
import { buildGroupHealth, type GroupHealth } from "@/lib/group-health"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const LOOKBACK_DAYS = 14 // enough to find each company's latest + previous snapshot

export interface GroupHealthResponse extends GroupHealth {
  group: { id: string; name: string }
}

// GET /api/groups/[groupId]/health — CEO per-company Company Health breakdown
// across a group: latest composite health per member company plus its movement
// vs the previous snapshot, banded, with the group average.
export const GET = withGates(
  {
    action: "groups.read",
    endpointClass: "api_read",
    requiredRoles: new Set(["group_ceo", "ceo", "system_administrator"] as const),
    requiredScope: "SCOPE_GROUP",
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    // path: .../groups/[groupId]/health → groupId is second-to-last segment
    const groupId = req.nextUrl.pathname.split("/").at(-2)!

    // Scope: the session's company must belong to this group (or platform admin).
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

    const [memberRows, groupRow] = await Promise.all([
      db
        .select({ companyId: groupMemberships.companyId, name: companies.name })
        .from(groupMemberships)
        .innerJoin(companies, eq(groupMemberships.companyId, companies.id))
        .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.isActive, true))),
      db
        .select({ name: companyGroups.name })
        .from(companyGroups)
        .where(eq(companyGroups.id, groupId))
        .limit(1),
    ])

    const companyIds = memberRows.map((m) => m.companyId)
    const nameById = new Map(memberRows.map((m) => [m.companyId, m.name]))

    // Latest two health snapshots per member company (newest first).
    const sinceStr = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString().slice(0, 10)
    const snapshotRows =
      companyIds.length > 0
        ? await db
            .select({
              companyId: kpiDailySnapshots.companyId,
              date: kpiDailySnapshots.snapshotDate,
              healthScore: kpiDailySnapshots.healthScore,
            })
            .from(kpiDailySnapshots)
            .where(
              and(
                inArray(kpiDailySnapshots.companyId, companyIds),
                gte(kpiDailySnapshots.snapshotDate, sinceStr)
              )
            )
            .orderBy(desc(kpiDailySnapshots.snapshotDate))
        : []

    // Rows arrive newest → oldest; first two seen per company are latest + previous.
    const byCompany = new Map<string, number[]>()
    for (const r of snapshotRows) {
      const list = byCompany.get(r.companyId) ?? []
      if (list.length < 2) {
        list.push(r.healthScore)
        byCompany.set(r.companyId, list)
      }
    }

    const health = buildGroupHealth(
      companyIds.map((cid) => {
        const scores = byCompany.get(cid) ?? []
        return {
          companyId: cid,
          name: nameById.get(cid) ?? "—",
          latestScore: scores.length > 0 ? scores[0]! : null,
          previousScore: scores.length > 1 ? scores[1]! : null,
        }
      })
    )

    const body: GroupHealthResponse = {
      ...health,
      group: { id: groupId, name: groupRow[0]?.name ?? "Group" },
    }
    return NextResponse.json(body)
  }
)
