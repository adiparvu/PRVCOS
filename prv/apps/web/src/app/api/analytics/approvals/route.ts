import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { approvalRequests } from "@prv/db/schema"
import { eq } from "drizzle-orm"
import {
  computeApprovalAnalytics,
  type ApprovalAnalytics,
  type ApprovalType,
  type ApprovalStatus,
} from "@/lib/approval-analytics"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type ApprovalAnalyticsResponse = ApprovalAnalytics

// GET /api/analytics/approvals — approval queue health: status mix, open/stale
// backlog, approval rate, average decision time and by-type breakdown.
export const GET = withGates(
  { action: "analytics.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select({
        type: approvalRequests.type,
        status: approvalRequests.status,
        createdAt: approvalRequests.createdAt,
        resolvedAt: approvalRequests.resolvedAt,
      })
      .from(approvalRequests)
      .where(eq(approvalRequests.companyId, ctx.session.companyId))

    const analytics = computeApprovalAnalytics(
      rows.map((r) => ({
        type: r.type as ApprovalType,
        status: r.status as ApprovalStatus,
        createdAt: r.createdAt.toISOString(),
        resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
      })),
      Date.now()
    )

    return NextResponse.json(analytics)
  }
)
