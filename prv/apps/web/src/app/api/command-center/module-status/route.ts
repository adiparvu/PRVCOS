import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { auditLogs } from "@prv/db/schema"
import { and, eq, gte } from "drizzle-orm"
import { computeModuleStatus, type ModuleStatusResult } from "@/lib/module-status"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const WINDOW_HOURS = 24

export type ModuleStatusResponse = ModuleStatusResult

// GET /api/command-center/module-status — per-module operational health from the
// last 24h of audit activity (event volume + access-control failures).
export const GET = withGates(
  { action: "audit_logs.read", endpointClass: "api_read", requiredScope: "SCOPE_COMPANY" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const since = new Date(Date.now() - WINDOW_HOURS * 3_600_000)

    const rows = await db
      .select({
        entityType: auditLogs.entityType,
        gateFailed: auditLogs.gateFailed,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(and(eq(auditLogs.companyId, ctx.session.companyId), gte(auditLogs.createdAt, since)))
      .limit(5000)

    const result = computeModuleStatus(
      rows.map((r) => ({
        entityType: r.entityType,
        gateFailed: Boolean(r.gateFailed),
        createdAt: r.createdAt.toISOString(),
      })),
      WINDOW_HOURS
    )

    return NextResponse.json(result)
  }
)
