import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { randomBytes, createHash } from "crypto"
import { db } from "@prv/db"
import { sysadminAccessSessions } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { RoleSets } from "@prv/auth"
import { inngest } from "@prv/jobs/client"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const JIT_SESSION_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

const startSchema = z.object({
  sessionId: z.string().uuid(),
})

export const POST = withGates(
  {
    action: "jit.start",
    endpointClass: "api_write",
    requiredRoles: RoleSets.admin,
    requireMfa: true,
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = startSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [existing] = await db
      .select()
      .from(sysadminAccessSessions)
      .where(
        and(
          eq(sysadminAccessSessions.id, parsed.data.sessionId),
          eq(sysadminAccessSessions.requestedBy, ctx.session.userId)
        )
      )
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: "JIT session not found" }, { status: 404 })
    }

    if (existing.status !== "approved" && existing.status !== "break_glass") {
      return NextResponse.json(
        { error: `Session cannot be started in status: ${existing.status}` },
        { status: 409 }
      )
    }

    const rawToken = "jit_" + randomBytes(32).toString("base64url")
    const tokenHash = createHash("sha256").update(rawToken).digest("hex")
    const now = new Date()
    const expiresAt = new Date(now.getTime() + JIT_SESSION_TTL_MS)

    await db
      .update(sysadminAccessSessions)
      .set({
        status: "active",
        sessionTokenHash: tokenHash,
        startedAt: now,
        expiresAt,
        updatedAt: now,
      })
      .where(eq(sysadminAccessSessions.id, parsed.data.sessionId))

    // Schedule auto-expiry via Inngest at exactly 2h
    await inngest.send({
      name: "prv/jit.session.started",
      data: { sessionId: parsed.data.sessionId, expiresAt: expiresAt.toISOString() },
    })

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "jit.start",
      entityType: "sysadmin_access_session",
      entityId: parsed.data.sessionId,
      method: "POST",
      path: "/api/jit/start",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      jitSessionId: parsed.data.sessionId,
    })

    return NextResponse.json({
      token: rawToken,
      expiresAt: expiresAt.toISOString(),
    })
  }
)
