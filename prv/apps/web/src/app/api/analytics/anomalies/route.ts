import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { kpiDailySnapshots } from "@prv/db/schema"
import { desc, eq } from "drizzle-orm"
import { detectAnomalies, type Anomaly } from "@/lib/anomaly-feed"
import { HEADLINE_METRICS } from "@/lib/kpi-trends"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface AnomaliesResponse {
  date: string | null
  anomalies: Anomaly[]
  meta: { total: number; critical: number; unfavourable: number }
}

// GET /api/analytics/anomalies — headline KPIs whose latest day-over-day move
// breaks the threshold, most-severe first.
export const GET = withGates(
  { action: "analytics.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = (await db
      .select()
      .from(kpiDailySnapshots)
      .where(eq(kpiDailySnapshots.companyId, ctx.session.companyId))
      .orderBy(desc(kpiDailySnapshots.snapshotDate))
      .limit(2)) as unknown as Record<string, unknown>[]

    // Query returns newest → oldest; the helper expects chronological order.
    const chrono = [...rows].reverse()
    const anomalies = detectAnomalies(chrono, HEADLINE_METRICS)
    const date = chrono.length ? String(chrono[chrono.length - 1]!.snapshotDate) : null

    return NextResponse.json({
      date,
      anomalies,
      meta: {
        total: anomalies.length,
        critical: anomalies.filter((a) => a.severity === "critical").length,
        unfavourable: anomalies.filter((a) => !a.favourable).length,
      },
    })
  }
)
