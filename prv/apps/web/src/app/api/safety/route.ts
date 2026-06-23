import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { safetyIncidents, safetyInspections, users } from "@prv/db/schema"
import { and, count, eq, gt, lt, lte, ne, desc, asc } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// ── Types ─────────────────────────────────────────────────────────────────────

export type IncidentSeverity = "low" | "medium" | "high" | "critical"
export type IncidentStatus = "open" | "under_investigation" | "resolved" | "closed"
export type IncidentType =
  | "accident"
  | "near_miss"
  | "hazard"
  | "property_damage"
  | "environmental"
  | "security"
export type InspectionStatus = "scheduled" | "in_progress" | "completed" | "overdue"

export interface SafetyMeta {
  totalIncidents: number
  openIncidents: number
  criticalIncidents: number
  overdueInspections: number
  upcomingInspections: number
  trainingExpiring: number
}

export interface IncidentSummary {
  id: string
  title: string
  type: IncidentType
  severity: IncidentSeverity
  status: IncidentStatus
  location: string | null
  incidentAt: string
  reportedBy: string | null
  injuriesCount: number
}

export interface InspectionSummary {
  id: string
  title: string
  status: InspectionStatus
  scheduledAt: string
  completedAt: string | null
  score: number | null
  maxScore: number | null
  assignedTo: string | null
  projectId: string | null
}

// ── GET /api/safety ───────────────────────────────────────────────────────────

export const GET = withGates(
  { action: "safety.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session

    const now = new Date()
    const in30Days = new Date(now.getTime() + 30 * 86_400_000)

    const [
      totalIncidentsRows,
      openIncidentsRows,
      criticalIncidentsRows,
      overdueInspectionsRows,
      upcomingInspectionsRows,
      recentIncidentRows,
      upcomingInspectionRows,
    ] = await Promise.all([
      db
        .select({ value: count() })
        .from(safetyIncidents)
        .where(eq(safetyIncidents.companyId, companyId)),

      db
        .select({ value: count() })
        .from(safetyIncidents)
        .where(and(eq(safetyIncidents.companyId, companyId), eq(safetyIncidents.status, "open"))),

      db
        .select({ value: count() })
        .from(safetyIncidents)
        .where(
          and(eq(safetyIncidents.companyId, companyId), eq(safetyIncidents.severity, "critical"))
        ),

      // overdue: scheduledAt < now AND status != completed
      db
        .select({ value: count() })
        .from(safetyInspections)
        .where(
          and(
            eq(safetyInspections.companyId, companyId),
            lt(safetyInspections.scheduledAt, now),
            ne(safetyInspections.status, "completed")
          )
        ),

      // upcoming in next 30 days
      db
        .select({ value: count() })
        .from(safetyInspections)
        .where(
          and(
            eq(safetyInspections.companyId, companyId),
            gt(safetyInspections.scheduledAt, now),
            lte(safetyInspections.scheduledAt, in30Days)
          )
        ),

      // last 5 incidents with reporter name
      db
        .select({
          id: safetyIncidents.id,
          title: safetyIncidents.title,
          type: safetyIncidents.type,
          severity: safetyIncidents.severity,
          status: safetyIncidents.status,
          location: safetyIncidents.location,
          incidentAt: safetyIncidents.incidentAt,
          injuriesCount: safetyIncidents.injuriesCount,
          reporterFirstName: users.firstName,
          reporterLastName: users.lastName,
        })
        .from(safetyIncidents)
        .leftJoin(users, eq(safetyIncidents.reportedBy, users.id))
        .where(eq(safetyIncidents.companyId, companyId))
        .orderBy(desc(safetyIncidents.incidentAt))
        .limit(5),

      // next 5 upcoming inspections
      db
        .select({
          id: safetyInspections.id,
          title: safetyInspections.title,
          status: safetyInspections.status,
          scheduledAt: safetyInspections.scheduledAt,
          completedAt: safetyInspections.completedAt,
          score: safetyInspections.score,
          maxScore: safetyInspections.maxScore,
          assignedTo: safetyInspections.assignedTo,
          projectId: safetyInspections.projectId,
        })
        .from(safetyInspections)
        .where(
          and(eq(safetyInspections.companyId, companyId), gt(safetyInspections.scheduledAt, now))
        )
        .orderBy(asc(safetyInspections.scheduledAt))
        .limit(5),
    ])

    const meta: SafetyMeta = {
      totalIncidents: totalIncidentsRows[0]?.value ?? 0,
      openIncidents: openIncidentsRows[0]?.value ?? 0,
      criticalIncidents: criticalIncidentsRows[0]?.value ?? 0,
      overdueInspections: overdueInspectionsRows[0]?.value ?? 0,
      upcomingInspections: upcomingInspectionsRows[0]?.value ?? 0,
      trainingExpiring: 0,
    }

    const recentIncidents: IncidentSummary[] = recentIncidentRows.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type as IncidentType,
      severity: r.severity as IncidentSeverity,
      status: r.status as IncidentStatus,
      location: r.location ?? null,
      incidentAt: r.incidentAt.toISOString(),
      reportedBy:
        r.reporterFirstName && r.reporterLastName
          ? `${r.reporterFirstName} ${r.reporterLastName}`
          : null,
      injuriesCount: r.injuriesCount,
    }))

    const upcomingInspections: InspectionSummary[] = upcomingInspectionRows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status as InspectionStatus,
      scheduledAt: r.scheduledAt.toISOString(),
      completedAt: r.completedAt ? r.completedAt.toISOString() : null,
      score: r.score ?? null,
      maxScore: r.maxScore ?? null,
      assignedTo: r.assignedTo ?? null,
      projectId: r.projectId ?? null,
    }))

    return NextResponse.json({ meta, recentIncidents, upcomingInspections })
  }
)
