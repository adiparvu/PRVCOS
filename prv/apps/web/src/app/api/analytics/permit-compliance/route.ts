import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { safetyPermits } from "@prv/db/schema"
import { and, count, eq, inArray, lt } from "drizzle-orm"
import { computePermitCompliance, type PermitCompliance } from "@/lib/permit-compliance"
import type { PermitStatus, PermitType } from "@/lib/ptw"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type PermitComplianceResponse = PermitCompliance & {
  byType: { type: PermitType; count: number }[]
}

// GET /api/analytics/permit-compliance — PTW governance KPIs for the company.
export const GET = withGates(
  { action: "analytics.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const now = new Date()

    const byStatus = await db
      .select({ status: safetyPermits.status, c: count() })
      .from(safetyPermits)
      .where(eq(safetyPermits.companyId, companyId))
      .groupBy(safetyPermits.status)

    const [activeExpiredRow] = await db
      .select({ c: count() })
      .from(safetyPermits)
      .where(
        and(
          eq(safetyPermits.companyId, companyId),
          inArray(safetyPermits.status, ["approved", "active"]),
          lt(safetyPermits.validTo, now)
        )
      )

    const byTypeRows = await db
      .select({ type: safetyPermits.type, c: count() })
      .from(safetyPermits)
      .where(eq(safetyPermits.companyId, companyId))
      .groupBy(safetyPermits.type)

    const s = (st: PermitStatus): number => byStatus.find((r) => r.status === st)?.c ?? 0
    const pendingApproval = s("pending_supervisor") + s("pending_safety_officer")
    const total = byStatus.reduce((a, r) => a + r.c, 0)

    const compliance = computePermitCompliance({
      total,
      draft: s("draft"),
      pendingApproval,
      approved: s("approved"),
      active: s("active"),
      closed: s("closed"),
      rejected: s("rejected"),
      expired: s("expired"),
      suspended: s("suspended"),
      revoked: s("revoked"),
      activeExpired: activeExpiredRow?.c ?? 0,
    })

    const res: PermitComplianceResponse = {
      ...compliance,
      byType: byTypeRows.map((r) => ({ type: r.type, count: r.c })),
    }
    return NextResponse.json(res)
  }
)
