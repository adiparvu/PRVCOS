import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and, ne } from "drizzle-orm"
import { db } from "@prv/db"
import { sysadminAccessSessions } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { RoleSets } from "@prv/auth"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const approveSchema = z.object({
  sessionId: z.string().uuid(),
})

export const POST = withGates(
  {
    action: "jit.approve",
    endpointClass: "api_write",
    requiredRoles: RoleSets.admin,
    requiredScope: "SCOPE_COMPANY",
    requireMfa: true,
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = approveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [existing] = await db
      .select()
      .from(sysadminAccessSessions)
      .where(eq(sysadminAccessSessions.id, parsed.data.sessionId))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: "JIT session not found" }, { status: 404 })
    }

    if (existing.status !== "pending") {
      return NextResponse.json(
        { error: `Session is already in status: ${existing.status}` },
        { status: 409 }
      )
    }

    // Approver cannot be the requestor
    if (existing.requestedBy === ctx.session.userId) {
      return NextResponse.json({ error: "Cannot approve your own JIT request" }, { status: 403 })
    }

    // Approver cannot be the same person as approver 1
    if (existing.approverId1 === ctx.session.userId) {
      return NextResponse.json({ error: "Already approved by this user" }, { status: 409 })
    }

    const now = new Date()

    // First approval
    if (!existing.approverId1) {
      await db
        .update(sysadminAccessSessions)
        .set({
          approverId1: ctx.session.userId,
          approvedAt1: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(sysadminAccessSessions.id, parsed.data.sessionId),
            eq(sysadminAccessSessions.status, "pending")
          )
        )

      void writeAuditLog({
        companyId: ctx.session.companyId,
        actorId: ctx.session.userId,
        sessionId: ctx.session.sessionId,
        action: "jit.approve.first",
        entityType: "sysadmin_access_session",
        entityId: parsed.data.sessionId,
        method: "POST",
        path: "/api/jit/approve",
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      })

      return NextResponse.json({ status: "pending", approvals: 1 })
    }

    // Second approval — transition to approved
    await db
      .update(sysadminAccessSessions)
      .set({
        approverId2: ctx.session.userId,
        approvedAt2: now,
        status: "approved",
        updatedAt: now,
      })
      .where(
        and(
          eq(sysadminAccessSessions.id, parsed.data.sessionId),
          eq(sysadminAccessSessions.status, "pending"),
          ne(sysadminAccessSessions.approverId1, ctx.session.userId)
        )
      )

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "jit.approve.second",
      entityType: "sysadmin_access_session",
      entityId: parsed.data.sessionId,
      method: "POST",
      path: "/api/jit/approve",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ status: "approved", approvals: 2 })
  }
)
