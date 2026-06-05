import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { cacheMemo } from "@prv/cache"
import { queryCompanyKpis } from "@prv/db"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// GET /api/dashboard/kpis — live company KPI aggregation, Redis-cached per company per month
export const GET = withGates(
  { action: "dashboard.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const periodKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`

    // Cache is per-company (not per-user): all users in a company share the same KPI snapshot.
    // Alerts are still user-scoped inside queryCompanyKpis — userId passed for that filter only.
    const kpis = await cacheMemo(
      "dashboard_kpis",
      `${companyId}:${periodKey}`,
      () => queryCompanyKpis(companyId, userId),
      { ttl: 60 }
    )

    return NextResponse.json({
      revenue: { value: kpis.revenue, currency: "RON", period: kpis.periodKey },
      activeProjects: { count: kpis.activeProjects },
      workforce: { count: kpis.workforce },
      alerts: { count: kpis.alerts },
    })
  }
)
