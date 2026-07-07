import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { candidates } from "@prv/db/schema"
import { eq } from "drizzle-orm"
import {
  computeRecruitmentFunnel,
  type RecruitmentFunnel,
  type CandidateStage,
} from "@/lib/recruitment-funnel"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type RecruitmentFunnelResponse = RecruitmentFunnel

// GET /api/analytics/recruitment-funnel — hiring funnel: reached-per-stage
// counts with conversion, plus totals and a source breakdown.
export const GET = withGates(
  { action: "analytics.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select({ stage: candidates.stage, source: candidates.source })
      .from(candidates)
      .where(eq(candidates.companyId, ctx.session.companyId))

    const funnel = computeRecruitmentFunnel(
      rows.map((r) => ({ stage: r.stage as CandidateStage, source: r.source }))
    )

    return NextResponse.json(funnel)
  }
)
