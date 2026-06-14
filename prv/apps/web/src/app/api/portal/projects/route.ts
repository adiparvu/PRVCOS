import { NextRequest, NextResponse } from "next/server"
import { withPortalAuth } from "@/lib/portal-middleware"
import type { PortalSessionContext } from "@/lib/portal-auth"
import { db } from "@prv/db"
import { renovationProjects, renovationContracts, renovationSiteReports } from "@prv/db/schema"
import { and, desc, eq, isNull, lt } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withPortalAuth(
  async (req: NextRequest, ctx: PortalSessionContext): Promise<NextResponse> => {
    if (!ctx.clientId) {
      return NextResponse.json(
        { error: "No client profile linked to this account" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const cursor = searchParams.get("cursor")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100)

    const conditions = [
      eq(renovationProjects.companyId, ctx.companyId),
      eq(renovationProjects.clientId, ctx.clientId),
      isNull(renovationProjects.deletedAt),
    ]

    if (status) {
      conditions.push(
        eq(renovationProjects.status, status as typeof renovationProjects.status._.data)
      )
    }
    if (cursor) conditions.push(lt(renovationProjects.createdAt, new Date(cursor)))

    const rows = await db
      .select({
        id: renovationProjects.id,
        projectCode: renovationProjects.projectCode,
        title: renovationProjects.title,
        status: renovationProjects.status,
        priority: renovationProjects.priority,
        projectType: renovationProjects.projectType,
        estimatedValue: renovationProjects.estimatedValue,
        contractedValue: renovationProjects.contractedValue,
        currency: renovationProjects.currency,
        completionPercentage: renovationProjects.completionPercentage,
        estimatedStartDate: renovationProjects.estimatedStartDate,
        estimatedEndDate: renovationProjects.estimatedEndDate,
        actualStartDate: renovationProjects.actualStartDate,
        actualEndDate: renovationProjects.actualEndDate,
        city: renovationProjects.city,
        address: renovationProjects.address,
        createdAt: renovationProjects.createdAt,
      })
      .from(renovationProjects)
      .where(and(...conditions))
      .orderBy(desc(renovationProjects.createdAt))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const projects = hasMore ? rows.slice(0, limit) : rows
    const nextCursor =
      hasMore && projects.length > 0 ? projects[projects.length - 1]!.createdAt.toISOString() : null

    const data = projects.map((r) => ({
      id: r.id,
      projectCode: r.projectCode,
      title: r.title,
      status: r.status,
      priority: r.priority,
      projectType: r.projectType,
      estimatedValue: r.estimatedValue ? Number(r.estimatedValue) : null,
      contractedValue: r.contractedValue ? Number(r.contractedValue) : null,
      currency: r.currency,
      completionPercentage: r.completionPercentage,
      estimatedStartDate: r.estimatedStartDate,
      estimatedEndDate: r.estimatedEndDate,
      actualStartDate: r.actualStartDate,
      actualEndDate: r.actualEndDate,
      city: r.city,
      address: r.address,
    }))

    return NextResponse.json({ projects: data, count: data.length, nextCursor })
  },
  { portalType: "client" }
)
