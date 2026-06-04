import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and, inArray } from "drizzle-orm"
import { db } from "@prv/db"
import { sysadminAccessSessions } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { RoleSets } from "@prv/auth"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const revokeSchema = z.object({
  sessionId: z.string().uuid(),
})

export const POST = withGates(
  {
    action: "jit.revoke",
    endpointClass: "api_write",
    requiredRoles: RoleSets.admin,
    requiredScope: "SCOPE_COMPANY",
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = revokeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const now = new Date()

    const result = await db
      .update(sysadminAccessSessions)
      .set({
        status: "revoked",
        revokedAt: now,
        revokedBy: ctx.session.userId,
        updatedAt: now,
      })
      .where(
        and(
          eq(sysadminAccessSessions.id, parsed.data.sessionId),
          inArray(sysadminAccessSessions.status, ["pending", "approved", "active", "break_glass"])
        )
      )
      .returning({ id: sysadminAccessSessions.id })

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Session not found or already terminated" },
        { status: 404 }
      )
    }

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "jit.revoke",
      entityType: "sysadmin_access_session",
      entityId: parsed.data.sessionId,
      method: "POST",
      path: "/api/jit/revoke",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ ok: true })
  }
)
