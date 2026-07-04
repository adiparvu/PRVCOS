import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { kpiDailySnapshots } from "@prv/db/schema"
import { desc, eq } from "drizzle-orm"
import { buildKpiTrends, HEADLINE_METRICS, type KpiTrend } from "@/lib/kpi-trends"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const WINDOW_DAYS = 30

export interface TrendsResponse {
  windowDays: number
  from: string | null
  to: string | null
  trends: KpiTrend[]
}

// GET /api/analytics/trends — headline KPI trends + period comparison over the
// last 30 daily snapshots (oldest → newest), with a sparkline per metric.
export const GET = withGates(
  { action: "analytics.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select()
      .from(kpiDailySnapshots)
      .where(eq(kpiDailySnapshots.companyId, ctx.session.companyId))
      .orderBy(desc(kpiDailySnapshots.snapshotDate))
      .limit(WINDOW_DAYS)

    // Query returns newest → oldest; reverse to chronological for the trend math.
    const chrono = [...rows].reverse() as unknown as Record<string, unknown>[]
    const trends = buildKpiTrends(chrono, HEADLINE_METRICS)

    const dates = chrono.map((r) => String(r.snapshotDate))
    return NextResponse.json({
      windowDays: WINDOW_DAYS,
      from: dates[0] ?? null,
      to: dates[dates.length - 1] ?? null,
      trends,
    })
  }
)
