import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { safetyIncidents } from "@prv/db/schema"
import { eq } from "drizzle-orm"
import {
  computeSafetyAnalytics,
  type SafetyAnalytics,
  type IncidentSeverity,
  type IncidentStatus,
} from "@/lib/safety-analytics"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type SafetyAnalyticsResponse = SafetyAnalytics

// GET /api/analytics/safety — safety-domain BI: aggregates the incident log into
// headline counts, a severity-weighted risk index, a type breakdown, and
// resolution performance (rate + mean time to resolve).
export const GET = withGates(
  { action: "analytics.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const companyId = ctx.session.companyId

    const rows = await db
      .select({
        severity: safetyIncidents.severity,
        type: safetyIncidents.type,
        status: safetyIncidents.status,
        injuriesCount: safetyIncidents.injuriesCount,
        incidentAt: safetyIncidents.incidentAt,
        closedAt: safetyIncidents.closedAt,
      })
      .from(safetyIncidents)
      .where(eq(safetyIncidents.companyId, companyId))

    const analytics = computeSafetyAnalytics(
      rows.map((r) => ({
        severity: r.severity as IncidentSeverity,
        type: r.type,
        status: r.status as IncidentStatus,
        injuriesCount: r.injuriesCount ?? 0,
        incidentAt: r.incidentAt.toISOString(),
        closedAt: r.closedAt ? r.closedAt.toISOString() : null,
      }))
    )

    return NextResponse.json(analytics)
  }
)
