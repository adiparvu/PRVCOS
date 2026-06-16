import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { renovationSiteReports, renovationProjects, users } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function ids(req: NextRequest) {
  const parts = req.nextUrl.pathname.split("/")
  return { projectId: parts.at(-3) ?? "", reportId: parts.at(-1) ?? "" }
}

async function resolveReport(projectId: string, reportId: string, companyId: string) {
  const [project] = await db
    .select({ id: renovationProjects.id })
    .from(renovationProjects)
    .where(
      and(
        eq(renovationProjects.id, projectId),
        eq(renovationProjects.companyId, companyId),
        isNull(renovationProjects.deletedAt)
      )
    )
    .limit(1)
  if (!project) return null

  const [report] = await db
    .select()
    .from(renovationSiteReports)
    .where(
      and(eq(renovationSiteReports.id, reportId), eq(renovationSiteReports.projectId, projectId))
    )
    .limit(1)

  return report ?? null
}

// ── GET /api/renovation/projects/[id]/site-reports/[reportId] ────────────────

export const GET = withGates(
  { action: "renovation.projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { projectId, reportId } = ids(req)
    const { companyId } = ctx.session

    const report = await resolveReport(projectId, reportId, companyId)
    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const submitterRows = await db
      .select({ firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, report.submittedBy))
      .limit(1)

    return NextResponse.json({
      report: {
        ...report,
        submittedByName: submitterRows[0]
          ? `${submitterRows[0].firstName} ${submitterRows[0].lastName}`
          : null,
      },
    })
  }
)

// ── PATCH /api/renovation/projects/[id]/site-reports/[reportId] ──────────────

const patchSchema = z.object({
  reportType: z.enum(["daily", "incident", "inspection", "milestone"]).optional(),
  phaseId: z.string().uuid().nullable().optional(),
  weatherConditions: z.string().max(100).nullable().optional(),
  workersOnSite: z.number().int().nonnegative().optional(),
  workPerformed: z.string().nullable().optional(),
  issuesEncountered: z.string().nullable().optional(),
  materialsUsed: z.array(z.record(z.unknown())).optional(),
  completionDelta: z.number().int().min(-100).max(100).optional(),
  photos: z.array(z.string()).optional(),
  clientVisible: z.boolean().optional(),
})

export const PATCH = withGates(
  { action: "renovation.projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { projectId, reportId } = ids(req)
    const { companyId, userId, sessionId } = ctx.session

    const report = await resolveReport(projectId, reportId, companyId)
    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )

    const [updated] = await db
      .update(renovationSiteReports)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(
        and(eq(renovationSiteReports.id, reportId), eq(renovationSiteReports.projectId, projectId))
      )
      .returning({
        id: renovationSiteReports.id,
        reportDate: renovationSiteReports.reportDate,
        reportType: renovationSiteReports.reportType,
      })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "renovation.site_reports.update",
      entityType: "renovation_site_report",
      entityId: reportId,
      payload: parsed.data,
      method: "PATCH",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

// ── DELETE /api/renovation/projects/[id]/site-reports/[reportId] ─────────────
// Hard-delete (site reports have no deletedAt column).
// Only the submitter or a project manager may delete.

export const DELETE = withGates(
  { action: "renovation.projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { projectId, reportId } = ids(req)
    const { companyId, userId, sessionId } = ctx.session

    const report = await resolveReport(projectId, reportId, companyId)
    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db
      .delete(renovationSiteReports)
      .where(
        and(eq(renovationSiteReports.id, reportId), eq(renovationSiteReports.projectId, projectId))
      )

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "renovation.site_reports.delete",
      entityType: "renovation_site_report",
      entityId: reportId,
      payload: { reportDate: report.reportDate, reportType: report.reportType },
      method: "DELETE",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
