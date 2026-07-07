import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { safetyTrainingRecords, users } from "@prv/db/schema"
import { eq } from "drizzle-orm"
import { computeTrainingCompliance, type TrainingCompliance } from "@/lib/training-compliance"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type SafetyTrainingResponse = TrainingCompliance

// GET /api/analytics/safety-training — safety certification & training expiry
// register with per-record urgency bands and a company compliance rate.
export const GET = withGates(
  { action: "analytics.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select({
        id: safetyTrainingRecords.id,
        trainingName: safetyTrainingRecords.trainingName,
        provider: safetyTrainingRecords.provider,
        expiresAt: safetyTrainingRecords.expiresAt,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(safetyTrainingRecords)
      .leftJoin(users, eq(safetyTrainingRecords.userId, users.id))
      .where(eq(safetyTrainingRecords.companyId, ctx.session.companyId))

    const compliance = computeTrainingCompliance(
      rows.map((r) => ({
        id: r.id,
        userName: r.firstName ? `${r.firstName} ${r.lastName ?? ""}`.trim() : "Unknown",
        trainingName: r.trainingName,
        provider: r.provider,
        expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
      })),
      Date.now()
    )

    return NextResponse.json(compliance)
  }
)
