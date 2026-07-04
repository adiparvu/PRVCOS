import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { kpiDailySnapshots } from "@prv/db/schema"
import { desc, eq } from "drizzle-orm"
import { computeCompanyHealth, type CompanyHealth } from "@/lib/company-health"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface CompanyHealthResponse extends CompanyHealth {
  date: string | null
}

// GET /api/analytics/company-health — composite company health index (0–100)
// with a per-domain breakdown, from the latest daily KPI snapshot.
export const GET = withGates(
  { action: "analytics.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const [latest] = (await db
      .select()
      .from(kpiDailySnapshots)
      .where(eq(kpiDailySnapshots.companyId, ctx.session.companyId))
      .orderBy(desc(kpiDailySnapshots.snapshotDate))
      .limit(1)) as unknown as Record<string, unknown>[]

    const health = computeCompanyHealth({
      revenueMonth: Number(latest?.revenueMonth ?? 0),
      grossProfit: Number(latest?.grossProfit ?? 0),
      overdueAmount: Number(latest?.overdueAmount ?? 0),
      totalTasks: Number(latest?.totalTasks ?? 0),
      doneTasks: Number(latest?.doneTasks ?? 0),
      headcount: Number(latest?.headcount ?? 0),
      presentToday: Number(latest?.presentToday ?? 0),
      pipelineValue: Number(latest?.pipelineValue ?? 0),
      activeLeads: Number(latest?.activeLeads ?? 0),
    })

    return NextResponse.json({ ...health, date: latest ? String(latest.snapshotDate) : null })
  }
)
