import { NextRequest, NextResponse } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { safetyIncidents, safetyInspections } from "@prv/db/schema"
import { and, asc, count, desc, eq, gte, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withMobileAuth(async (_req: NextRequest, ctx) => {
  const { companyId } = ctx

  const now = new Date()

  const [incidents, inspections] = await Promise.all([
    db
      .select({
        id: safetyIncidents.id,
        title: safetyIncidents.title,
        type: safetyIncidents.type,
        severity: safetyIncidents.severity,
        status: safetyIncidents.status,
        location: safetyIncidents.location,
        incidentAt: safetyIncidents.incidentAt,
      })
      .from(safetyIncidents)
      .where(eq(safetyIncidents.companyId, companyId))
      .orderBy(desc(safetyIncidents.incidentAt))
      .limit(15),

    db
      .select({
        id: safetyInspections.id,
        title: safetyInspections.title,
        status: safetyInspections.status,
        scheduledAt: safetyInspections.scheduledAt,
        score: safetyInspections.score,
        maxScore: safetyInspections.maxScore,
      })
      .from(safetyInspections)
      .where(eq(safetyInspections.companyId, companyId))
      .orderBy(asc(safetyInspections.scheduledAt))
      .limit(10),
  ])

  const openIncidents = incidents.filter((i) => i.status === "open").length
  const criticalOpen = incidents.filter(
    (i) => i.severity === "critical" && i.status !== "resolved" && i.status !== "closed"
  ).length
  const overdueInspections = inspections.filter((i) => i.status === "overdue").length
  const nextScheduled = inspections.find((i) => i.status === "scheduled" && i.scheduledAt >= now)

  const kpi = {
    openIncidents,
    critical: criticalOpen,
    overdueInspections,
    nextInspection: nextScheduled?.scheduledAt.toISOString() ?? null,
  }

  const mappedIncidents = incidents.map((i) => ({
    id: i.id,
    type: i.type,
    title: i.title,
    severity: i.severity,
    status: i.status === "under_investigation" ? "investigating" : i.status,
    location: i.location ?? "",
    date: i.incidentAt.toISOString(),
  }))

  const mappedInspections = inspections.map((i) => ({
    id: i.id,
    title: i.title,
    scheduledDate: i.scheduledAt.toISOString(),
    status: i.status,
    score: i.score ?? null,
    maxScore: i.maxScore ?? null,
  }))

  return NextResponse.json({ kpi, incidents: mappedIncidents, inspections: mappedInspections })
})
