import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { renovationSiteReports, renovationProjects, users } from "@prv/db/schema"
import { and, desc, eq, isNull, lt } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function projectId(req: NextRequest) {
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}

export const GET = withGates(
  { action: "renovation.projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = projectId(req)
    const { companyId } = ctx.session
    const { searchParams } = req.nextUrl
    const cursor = searchParams.get("cursor")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100)

    const [project] = await db
      .select({ id: renovationProjects.id })
      .from(renovationProjects)
      .where(
        and(
          eq(renovationProjects.id, id),
          eq(renovationProjects.companyId, companyId),
          isNull(renovationProjects.deletedAt)
        )
      )
      .limit(1)
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const conditions = [eq(renovationSiteReports.projectId, id)]
    if (cursor) conditions.push(lt(renovationSiteReports.reportDate, cursor))

    const reports = await db
      .select({
        id: renovationSiteReports.id,
        reportDate: renovationSiteReports.reportDate,
        reportType: renovationSiteReports.reportType,
        phaseId: renovationSiteReports.phaseId,
        weatherConditions: renovationSiteReports.weatherConditions,
        workersOnSite: renovationSiteReports.workersOnSite,
        workPerformed: renovationSiteReports.workPerformed,
        issuesEncountered: renovationSiteReports.issuesEncountered,
        completionDelta: renovationSiteReports.completionDelta,
        clientVisible: renovationSiteReports.clientVisible,
        submittedBy: renovationSiteReports.submittedBy,
        submitterFirstName: users.firstName,
        submitterLastName: users.lastName,
        createdAt: renovationSiteReports.createdAt,
      })
      .from(renovationSiteReports)
      .leftJoin(users, eq(renovationSiteReports.submittedBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(renovationSiteReports.reportDate))
      .limit(limit + 1)

    const hasMore = reports.length > limit
    const data = hasMore ? reports.slice(0, limit) : reports
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1]!.reportDate : null

    return NextResponse.json({
      reports: data.map((r) => ({
        ...r,
        submittedByName:
          r.submitterFirstName && r.submitterLastName
            ? `${r.submitterFirstName} ${r.submitterLastName}`
            : null,
      })),
      nextCursor,
    })
  }
)

const createSchema = z.object({
  reportDate: z.string().min(1),
  reportType: z.enum(["daily", "incident", "inspection", "milestone"]).optional(),
  phaseId: z.string().uuid().nullable().optional(),
  weatherConditions: z.string().max(100).optional(),
  workersOnSite: z.number().int().nonnegative().optional(),
  workPerformed: z.string().optional(),
  issuesEncountered: z.string().optional(),
  completionDelta: z.number().int().min(-100).max(100).optional(),
  clientVisible: z.boolean().optional(),
})

export const POST = withGates(
  { action: "renovation.projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = projectId(req)
    const { companyId, userId } = ctx.session

    const [project] = await db
      .select({ id: renovationProjects.id })
      .from(renovationProjects)
      .where(
        and(
          eq(renovationProjects.id, id),
          eq(renovationProjects.companyId, companyId),
          isNull(renovationProjects.deletedAt)
        )
      )
      .limit(1)
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [report] = await db
      .insert(renovationSiteReports)
      .values({
        projectId: id,
        submittedBy: userId,
        ...parsed.data,
      })
      .returning({ id: renovationSiteReports.id, reportDate: renovationSiteReports.reportDate })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "renovation.site-reports.create",
      entityType: "renovation_site_report",
      entityId: report!.id,
      payload: parsed.data,
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(report, { status: 201 })
  }
)
