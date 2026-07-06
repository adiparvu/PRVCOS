import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { safetyIncidents, safetyInspections } from "@prv/db/schema"
import { eq } from "drizzle-orm"
import { computeSafetyMetrics, type SafetyMetrics } from "@/lib/safety-metrics"
import {
  computeInspectionCompliance,
  type InspectionCompliance,
  type InspectionStatus,
} from "@/lib/inspection-compliance"
import { computeIncidentTrend, type IncidentTrend } from "@/lib/incident-trend"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type SafetyMetricsResponse = SafetyMetrics & {
  inspections: InspectionCompliance
  trend: IncidentTrend
}

// GET /api/analytics/safety-metrics — safety-officer KPIs: days since last
// incident, 30-day count, recordable/near-miss split, high-risk locations,
// inspection compliance, and the month-over-month incident trend.
export const GET = withGates(
  { action: "analytics.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const companyId = ctx.session.companyId

    const [incidentRows, inspectionRows] = await Promise.all([
      db
        .select({
          type: safetyIncidents.type,
          incidentAt: safetyIncidents.incidentAt,
          location: safetyIncidents.location,
        })
        .from(safetyIncidents)
        .where(eq(safetyIncidents.companyId, companyId)),
      db
        .select({
          status: safetyInspections.status,
          scheduledAt: safetyInspections.scheduledAt,
          completedAt: safetyInspections.completedAt,
          score: safetyInspections.score,
          maxScore: safetyInspections.maxScore,
        })
        .from(safetyInspections)
        .where(eq(safetyInspections.companyId, companyId)),
    ])

    const now = Date.now()
    const incidents = incidentRows.map((r) => ({
      type: r.type as string,
      incidentAt: r.incidentAt.toISOString(),
      location: r.location,
    }))

    const metrics = computeSafetyMetrics(incidents, now)
    const trend = computeIncidentTrend(incidents, now, 6)
    const inspections = computeInspectionCompliance(
      inspectionRows.map((r) => ({
        status: r.status as InspectionStatus,
        scheduledAt: r.scheduledAt.toISOString(),
        completedAt: r.completedAt ? r.completedAt.toISOString() : null,
        score: r.score,
        maxScore: r.maxScore,
      })),
      now
    )

    return NextResponse.json({ ...metrics, inspections, trend })
  }
)
