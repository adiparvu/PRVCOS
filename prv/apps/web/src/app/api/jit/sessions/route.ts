import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, desc } from "drizzle-orm"
import { db } from "@prv/db"
import { sysadminAccessSessions, jitStatusEnum } from "@prv/db/schema"

import { RoleSets } from "@prv/auth"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type JitStatus = (typeof jitStatusEnum.enumValues)[number]

export const GET = withGates(
  {
    action: "jit.sessions.list",
    endpointClass: "api_read",
    requiredRoles: RoleSets.admin,
    requiredScope: "SCOPE_COMPANY",
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const url = new URL(req.url)
    const statusParam = url.searchParams.get("status") as JitStatus | null

    const validStatuses: JitStatus[] = [
      "pending",
      "approved",
      "active",
      "expired",
      "revoked",
      "break_glass",
    ]

    const rows = await db
      .select({
        id: sysadminAccessSessions.id,
        requestedBy: sysadminAccessSessions.requestedBy,
        companyId: sysadminAccessSessions.companyId,
        status: sysadminAccessSessions.status,
        justification: sysadminAccessSessions.justification,
        isBreakGlass: sysadminAccessSessions.isBreakGlass,
        approverId1: sysadminAccessSessions.approverId1,
        approvedAt1: sysadminAccessSessions.approvedAt1,
        approverId2: sysadminAccessSessions.approverId2,
        approvedAt2: sysadminAccessSessions.approvedAt2,
        startedAt: sysadminAccessSessions.startedAt,
        expiresAt: sysadminAccessSessions.expiresAt,
        revokedAt: sysadminAccessSessions.revokedAt,
        revokedBy: sysadminAccessSessions.revokedBy,
        createdAt: sysadminAccessSessions.createdAt,
      })
      .from(sysadminAccessSessions)
      .where(
        statusParam && validStatuses.includes(statusParam)
          ? eq(sysadminAccessSessions.status, statusParam)
          : undefined
      )
      .orderBy(desc(sysadminAccessSessions.createdAt))
      .limit(100)

    return NextResponse.json({ sessions: rows, total: rows.length })
  }
)
