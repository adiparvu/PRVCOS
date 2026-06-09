import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { anomalyDetections } from "@prv/db/schema"
import { and, desc, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withGates(
  { action: "intelligence.anomalies.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session

    const rows = await db
      .select({
        type: anomalyDetections.type,
        severity: anomalyDetections.severity,
        domain: anomalyDetections.domain,
        title: anomalyDetections.title,
        description: anomalyDetections.description,
        metric: anomalyDetections.metric,
        actionLabel: anomalyDetections.actionLabel,
        href: anomalyDetections.href,
      })
      .from(anomalyDetections)
      .where(and(eq(anomalyDetections.companyId, companyId), isNull(anomalyDetections.resolvedAt)))
      .orderBy(desc(anomalyDetections.createdAt))

    return NextResponse.json({ anomalies: rows })
  }
)
