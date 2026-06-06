import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { cacheMemo } from "@prv/cache"
import { queryCompanyKpis, queryManagerKpis } from "@prv/db"
import type { GateContext, SystemRole } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MANAGER_ROLES = new Set<SystemRole>([
  "department_head",
  "oms",
  "operations_manager",
  "hr_payroll",
  "project_oms",
  "project_operations_manager",
  "project_director",
  "store_manager",
  "shop_director",
])

// GET /api/dashboard/live-kpis — role-aware KPI endpoint for realtime hooks
export const GET = withGates(
  { action: "dashboard.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId, role } = ctx.session
    const periodKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`

    if (MANAGER_ROLES.has(role)) {
      const kpis = await cacheMemo(
        "mgr_kpis",
        `${companyId}:${userId}:${periodKey}`,
        () => queryManagerKpis(companyId, userId),
        { ttl: 60 }
      )
      return NextResponse.json({
        revenue: kpis.revenue,
        workforce: kpis.workforce,
        activeProjects: kpis.activeProjects,
        alerts: kpis.alerts,
        pendingApprovals: kpis.pendingApprovals,
      })
    }

    const kpis = await cacheMemo(
      "dashboard_kpis",
      `${companyId}:${periodKey}`,
      () => queryCompanyKpis(companyId, userId),
      { ttl: 60 }
    )
    return NextResponse.json({
      revenue: kpis.revenue,
      workforce: kpis.workforce,
      activeProjects: kpis.activeProjects,
      alerts: kpis.alerts,
      pendingApprovals: 0,
    })
  }
)
