import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import { db } from "@prv/db"
import {
  companyGroups,
  groupMemberships,
  companies,
  invoices,
  projects,
  companyMemberships,
  groupKpiSnapshots,
} from "@prv/db/schema"
import { and, eq, gte, isNull, inArray, desc, sql } from "drizzle-orm"
import { hasScope } from "@prv/auth"
import { queryGroupKpis, type GroupKpis } from "@prv/db/queries/group-kpis"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface GroupRollupRow {
  companyId: string
  name: string
  revenue: number
  share: number
  activeProjects: number
  headcount: number
}

export interface GroupRollup {
  group: { id: string; name: string }
  period: string
  kpis: GroupKpis
  trend: { labels: string[]; revenue: number[] }
  breakdown: GroupRollupRow[]
}

// GET /api/groups/[groupId]/rollup — CEO group rollup: live aggregate KPIs,
// the nightly revenue-snapshot trend, and a per-company breakdown.
export const GET = withGates(
  {
    action: "groups.read",
    endpointClass: "api_read",
    requiredRoles: new Set(["group_ceo", "ceo", "system_administrator"] as const),
    requiredScope: "SCOPE_GROUP",
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    // path: .../groups/[groupId]/rollup → groupId is second-to-last segment
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

    // Active member company IDs + names.
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

    // Rolling 1W/1M, calendar QTD/YTD — bounds the revenue window + trend length.
    const raw = (req.nextUrl.searchParams.get("period") ?? "qtd").toLowerCase()
    const period = ["1w", "1m", "qtd", "ytd"].includes(raw) ? raw : "qtd"
    const now = new Date()
    const windowStart =
      period === "1w"
        ? new Date(now.getTime() - 7 * 86_400_000)
        : period === "1m"
          ? new Date(now.getTime() - 30 * 86_400_000)
          : period === "ytd"
            ? new Date(now.getFullYear(), 0, 1)
            : new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    const windowStartStr = windowStart.toISOString().slice(0, 10)

    // Point-in-time KPIs (projects / employees / alerts) + the windowed trend.
    const [kpis, snapshotRows] = await Promise.all([
      queryGroupKpis(groupId, ctx.session.userId),
      db
        .select({ date: groupKpiSnapshots.snapshotDate, revenue: groupKpiSnapshots.totalRevenue })
        .from(groupKpiSnapshots)
        .where(
          and(
            eq(groupKpiSnapshots.groupId, groupId),
            gte(groupKpiSnapshots.snapshotDate, windowStartStr)
          )
        )
        .orderBy(desc(groupKpiSnapshots.snapshotDate))
        .limit(31),
    ])

    // Per-company breakdown (live, windowed to the period). Empty group → no rows.
    let breakdown: GroupRollupRow[] = []
    let groupRevenue = 0
    if (companyIds.length > 0) {
      const [revRows, projRows, headRows] = await Promise.all([
        db
          .select({
            companyId: invoices.companyId,
            total: sql<string>`COALESCE(SUM(${invoices.total}), 0)::text`,
          })
          .from(invoices)
          .where(
            and(
              inArray(invoices.companyId, companyIds),
              eq(invoices.status, "paid"),
              gte(invoices.paidAt, windowStart)
            )
          )
          .groupBy(invoices.companyId),
        db
          .select({ companyId: projects.companyId, count: sql<number>`COUNT(*)::int` })
          .from(projects)
          .where(
            and(
              inArray(projects.companyId, companyIds),
              eq(projects.status, "active"),
              eq(projects.isActive, true),
              isNull(projects.deletedAt)
            )
          )
          .groupBy(projects.companyId),
        db
          .select({ companyId: companyMemberships.companyId, count: sql<number>`COUNT(*)::int` })
          .from(companyMemberships)
          .where(
            and(
              inArray(companyMemberships.companyId, companyIds),
              eq(companyMemberships.status, "ACTIVE")
            )
          )
          .groupBy(companyMemberships.companyId),
      ])

      const revById = new Map(revRows.map((r) => [r.companyId, Math.round(Number(r.total))]))
      const projById = new Map(projRows.map((r) => [r.companyId, r.count]))
      const headById = new Map(headRows.map((r) => [r.companyId, r.count]))
      const totalRevenue = Array.from(revById.values()).reduce((a, b) => a + b, 0)
      groupRevenue = totalRevenue

      breakdown = companyIds
        .map((cid) => {
          const revenue = revById.get(cid) ?? 0
          return {
            companyId: cid,
            name: nameById.get(cid) ?? "—",
            revenue,
            share: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0,
            activeProjects: projById.get(cid) ?? 0,
            headcount: headById.get(cid) ?? 0,
          }
        })
        .sort((a, b) => b.revenue - a.revenue)
    }

    // Snapshot trend oldest → newest, label as DD Mon.
    const MONTHS = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ]
    const ordered = [...snapshotRows].reverse()
    const trend = {
      labels: ordered.map((s) => {
        const d = new Date(s.date + "T12:00:00Z")
        return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
      }),
      revenue: ordered.map((s) => Math.round(Number(s.revenue))),
    }

    // Headline revenue reflects the selected period and equals the breakdown sum.
    kpis.totalRevenue = String(groupRevenue)

    const rollup: GroupRollup = {
      group: { id: groupId, name: groupRow[0]?.name ?? "Group" },
      period,
      kpis,
      trend,
      breakdown,
    }

    return NextResponse.json(rollup)
  }
)
