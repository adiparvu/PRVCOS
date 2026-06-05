import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { sql, eq, and, gte, lt, isNull, inArray } from "drizzle-orm"
import { db } from "@prv/db"
import { invoices, projects, companyMemberships, notifications } from "@prv/db/schema"
import { cacheMemo, CacheTTL } from "@prv/cache"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// GET /api/dashboard/kpis — live company KPI aggregation, Redis-cached for 60 s
export const GET = withGates(
  { action: "dashboard.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

    const kpis = await cacheMemo(
      "dashboard_kpis",
      `${companyId}:${userId}:${periodKey}`,
      async () => {
        const [revenueRow, projectsRow, workforceRow, alertsRow] = await Promise.all([
          // Revenue: sum of paid invoices this calendar month
          db
            .select({ total: sql<string>`COALESCE(SUM(${invoices.total}), 0)::text` })
            .from(invoices)
            .where(
              and(
                eq(invoices.companyId, companyId),
                eq(invoices.status, "paid"),
                gte(invoices.paidAt, startOfMonth),
                lt(invoices.paidAt, startOfNextMonth)
              )
            ),

          // Active projects (non-deleted)
          db
            .select({ count: sql<number>`COUNT(*)::int` })
            .from(projects)
            .where(
              and(
                eq(projects.companyId, companyId),
                eq(projects.status, "active"),
                eq(projects.isActive, true),
                isNull(projects.deletedAt)
              )
            ),

          // Active workforce (ACTIVE memberships)
          db
            .select({ count: sql<number>`COUNT(*)::int` })
            .from(companyMemberships)
            .where(
              and(
                eq(companyMemberships.companyId, companyId),
                eq(companyMemberships.status, "ACTIVE")
              )
            ),

          // Unread critical/warning notifications for this user
          db
            .select({ count: sql<number>`COUNT(*)::int` })
            .from(notifications)
            .where(
              and(
                eq(notifications.companyId, companyId),
                eq(notifications.userId, userId),
                eq(notifications.isRead, false),
                eq(notifications.isDismissed, false),
                inArray(notifications.type, ["error", "warning", "action_required"])
              )
            ),
        ])

        return {
          revenue: {
            value: revenueRow[0]?.total ?? "0",
            currency: "RON",
            period: periodKey,
          },
          activeProjects: { count: projectsRow[0]?.count ?? 0 },
          workforce: { count: workforceRow[0]?.count ?? 0 },
          alerts: { count: alertsRow[0]?.count ?? 0 },
        }
      },
      { ttl: 60 }
    )

    return NextResponse.json(kpis)
  }
)
