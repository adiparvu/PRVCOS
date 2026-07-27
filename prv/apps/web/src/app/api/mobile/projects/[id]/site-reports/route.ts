import { NextRequest, NextResponse } from "next/server"
import { db } from "@prv/db"
import { renovationProjects, renovationSiteReports } from "@prv/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { writeAuditLog } from "@prv/auth"
import { withMobileAuth } from "@/lib/mobile/auth"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Site reports from the field (preview approved 2026-07). Core projects and
// renovation projects are bridged via renovation_projects.project_id — the
// same bridge the client portal uses for its photo wall. A core project with
// no renovation bridge has no site reports; the app disables both actions.

function projectIdFromPath(req: NextRequest): string {
  const parts = req.nextUrl.pathname.split("/").filter(Boolean)
  return parts[parts.indexOf("projects") + 1] ?? ""
}

async function resolveRenovationProject(
  coreProjectId: string,
  companyId: string
): Promise<string | null> {
  const [row] = await db
    .select({ id: renovationProjects.id })
    .from(renovationProjects)
    .where(
      and(
        eq(renovationProjects.projectId, coreProjectId),
        eq(renovationProjects.companyId, companyId)
      )
    )
    .limit(1)
  return row?.id ?? null
}

export interface MobileSiteReport {
  id: string
  reportDate: string
  reportType: string
  workPerformed: string | null
  issuesEncountered: string | null
  workersOnSite: number
  clientVisible: boolean
  photos: string[]
}

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const coreId = projectIdFromPath(req)
  if (!coreId) return NextResponse.json({ error: "Missing project id" }, { status: 400 })

  const renovationId = await resolveRenovationProject(coreId, ctx.companyId)
  if (!renovationId) return NextResponse.json({ renovation: false, reports: [] })

  const rows = await db
    .select({
      id: renovationSiteReports.id,
      reportDate: renovationSiteReports.reportDate,
      reportType: renovationSiteReports.reportType,
      workPerformed: renovationSiteReports.workPerformed,
      issuesEncountered: renovationSiteReports.issuesEncountered,
      workersOnSite: renovationSiteReports.workersOnSite,
      clientVisible: renovationSiteReports.clientVisible,
      photos: renovationSiteReports.photos,
    })
    .from(renovationSiteReports)
    .where(eq(renovationSiteReports.projectId, renovationId))
    .orderBy(desc(renovationSiteReports.reportDate), desc(renovationSiteReports.createdAt))
    .limit(60)

  const reports: MobileSiteReport[] = rows.map((r) => ({
    id: r.id,
    reportDate: String(r.reportDate),
    reportType: r.reportType,
    workPerformed: r.workPerformed,
    issuesEncountered: r.issuesEncountered,
    workersOnSite: r.workersOnSite,
    clientVisible: r.clientVisible,
    // photos is a jsonb array of storage URLs — same parse as the portal.
    photos: (Array.isArray(r.photos) ? (r.photos as unknown[]) : []).filter(
      (u): u is string => typeof u === "string"
    ),
  }))

  return NextResponse.json({ renovation: true, reports })
})

// Mirrors the web create contract (POST /api/renovation/projects/[id]/site-reports)
// so both surfaces feed the same reports. reportDate comes from the client so a
// queued offline report keeps the day it was written, not the day it synced.
const createSchema = z.object({
  reportDate: z.string().min(1),
  reportType: z.enum(["daily", "incident", "inspection", "milestone"]).optional(),
  weatherConditions: z.string().max(100).optional(),
  workersOnSite: z.number().int().nonnegative().optional(),
  workPerformed: z.string().min(1),
  issuesEncountered: z.string().optional(),
  completionDelta: z.number().int().min(-100).max(100).optional(),
  clientVisible: z.boolean().optional(),
})

export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  const coreId = projectIdFromPath(req)
  if (!coreId) return NextResponse.json({ error: "Missing project id" }, { status: 400 })

  // 404 (not 5xx) when the project has no renovation bridge: the offline queue
  // drops 4xx rejections instead of retrying them forever.
  const renovationId = await resolveRenovationProject(coreId, ctx.companyId)
  if (!renovationId) {
    return NextResponse.json(
      { error: "Not a renovation project", code: "NOT_RENOVATION" },
      { status: 404 }
    )
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = createSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 422 }
    )
  }

  const [report] = await db
    .insert(renovationSiteReports)
    .values({
      projectId: renovationId,
      submittedBy: ctx.userId,
      ...parsed.data,
    })
    .returning({ id: renovationSiteReports.id, reportDate: renovationSiteReports.reportDate })

  if (!report) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "mobile.renovation.site_report.create",
    entityType: "renovation_site_report",
    entityId: report.id,
    method: "POST",
    path: req.nextUrl.pathname,
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
    userAgent: req.headers.get("user-agent") ?? "",
    payload: parsed.data,
  })

  return NextResponse.json({ id: report.id, reportDate: report.reportDate }, { status: 201 })
})
