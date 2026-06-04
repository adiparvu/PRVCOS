import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { randomBytes, createHash } from "crypto"
import { db } from "@prv/db"
import { sysadminAccessSessions } from "@prv/db/schema"
import { writeAuditLog, logSecurityEvent } from "@prv/auth"
import type { SystemRole } from "@prv/auth"
import { inngest } from "@prv/jobs/client"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const JIT_SESSION_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

// system_administrator only — break-glass bypasses 4-eyes requirement
const BREAK_GLASS_ROLES = new Set<SystemRole>(["system_administrator"])

const breakGlassSchema = z.object({
  justification: z.string().min(50, "Break-glass justification must be at least 50 characters"),
  targetCompanyId: z.string().uuid().optional(),
})

export const POST = withGates(
  {
    action: "jit.break_glass",
    endpointClass: "api_write",
    requiredRoles: BREAK_GLASS_ROLES,
    requireMfa: true,
    requireReauth: true,
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = breakGlassSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const rawToken = "jit_" + randomBytes(32).toString("base64url")
    const tokenHash = createHash("sha256").update(rawToken).digest("hex")
    const now = new Date()
    const expiresAt = new Date(now.getTime() + JIT_SESSION_TTL_MS)

    const [session] = await db
      .insert(sysadminAccessSessions)
      .values({
        requestedBy: ctx.session.userId,
        companyId: parsed.data.targetCompanyId ?? ctx.session.companyId,
        justification: parsed.data.justification,
        isBreakGlass: true,
        breakGlassJustification: parsed.data.justification,
        // Single-approver: requestor is also the approver in break-glass
        approverId1: ctx.session.userId,
        approvedAt1: now,
        status: "break_glass",
        sessionTokenHash: tokenHash,
        startedAt: now,
        expiresAt,
      })
      .returning({ id: sysadminAccessSessions.id })

    // Schedule auto-expiry
    await inngest.send({
      name: "prv/jit.session.started",
      data: { sessionId: session!.id, expiresAt: expiresAt.toISOString() },
    })

    // Log high-severity security event — break-glass always triggers an alert
    void logSecurityEvent({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      eventType: "privilege_escalation",
      severity: "critical",
      metadata: {
        action: "jit_break_glass",
        sessionId: session!.id,
        justification: parsed.data.justification,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      path: "/api/jit/break-glass",
      sessionId: ctx.session.sessionId,
    })

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "jit.break_glass",
      entityType: "sysadmin_access_session",
      entityId: session!.id,
      method: "POST",
      path: "/api/jit/break-glass",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      jitSessionId: session!.id,
    })

    return NextResponse.json({
      token: rawToken,
      sessionId: session!.id,
      expiresAt: expiresAt.toISOString(),
      warning: "Break-glass access is logged and reviewed. Use only in genuine emergencies.",
    })
  }
)
