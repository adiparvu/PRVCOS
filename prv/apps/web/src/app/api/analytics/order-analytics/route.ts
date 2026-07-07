import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { orders } from "@prv/db/schema"
import { and, eq, gte, isNull } from "drizzle-orm"
import { computeOrderAnalytics, type OrderAnalytics, type OrderStatus } from "@/lib/order-analytics"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const LOOKBACK_DAYS = 200 // covers the 6-month trend window with headroom

export type OrderAnalyticsResponse = OrderAnalytics

// GET /api/analytics/order-analytics — order volume, booked revenue, AOV,
// fulfillment status mix and the monthly revenue trend from the order ledger.
export const GET = withGates(
  { action: "analytics.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000)

    const rows = await db
      .select({ status: orders.status, total: orders.total, createdAt: orders.createdAt })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, ctx.session.companyId),
          isNull(orders.deletedAt),
          gte(orders.createdAt, since)
        )
      )

    const analytics = computeOrderAnalytics(
      rows.map((r) => ({
        status: r.status as OrderStatus,
        total: Number(r.total ?? 0),
        createdAt: r.createdAt.toISOString(),
      })),
      Date.now(),
      6
    )

    return NextResponse.json(analytics)
  }
)
