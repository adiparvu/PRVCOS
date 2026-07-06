import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { safetyIncidents } from "@prv/db/schema"
import { eq } from "drizzle-orm"
import { computeSafetyMetrics, type SafetyMetrics } from "@/lib/safety-metrics"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type SafetyMetricsResponse = SafetyMetrics

// GET /api/analytics/safety-metrics — safety-officer KPIs: days since last
// incident, 30-day count, recordable/near-miss split, high-risk locations.
export const GET = withGates(
  { action: "analytics.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select({
        type: safetyIncidents.type,
        incidentAt: safetyIncidents.incidentAt,
        location: safetyIncidents.location,
      })
      .from(safetyIncidents)
      .where(eq(safetyIncidents.companyId, ctx.session.companyId))

    const metrics = computeSafetyMetrics(
      rows.map((r) => ({
        type: r.type as string,
        incidentAt: r.incidentAt.toISOString(),
        location: r.location,
      })),
      Date.now()
    )

    return NextResponse.json(metrics)
  }
)
