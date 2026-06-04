import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db } from "@prv/db"
import { companyMemberships } from "@prv/db/schema"
import { writeAuditLog, createSession, revokeSession } from "@prv/auth"
import { getSessionTTL } from "@prv/cache"
import { z } from "zod"
import type { GateContext, PRVSession, ScopeLevel, SystemRole } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const PRV_SESSION_COOKIE = "prv_session"

// Mapping from numeric scopeLevel (DB) to ScopeLevel string (session)
const SCOPE_MAP: Record<number, ScopeLevel> = {
  1: "SCOPE_RECORD",
  2: "SCOPE_TEAM",
  3: "SCOPE_DEPARTMENT",
  4: "SCOPE_STORE",
  5: "SCOPE_REGION",
  6: "SCOPE_COMPANY",
  7: "SCOPE_GROUP",
  8: "SCOPE_PLATFORM",
  9: "SCOPE_GLOBAL",
}

const switchSchema = z.object({
  targetCompanyId: z.string().uuid(),
})

// POST /api/auth/context/switch — switch the caller's active company context
// Validates the requesting user has an ACTIVE membership in targetCompanyId,
// then issues a new session scoped to that company and revokes the old one.
export const POST = withGates(
  { action: "auth.context.switch", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = switchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const { targetCompanyId } = parsed.data

    // No-op if already in that context
    if (targetCompanyId === ctx.session.companyId) {
      return NextResponse.json(
        { error: "Already in this company context", code: "NO_SWITCH_NEEDED" },
        { status: 422 }
      )
    }

    // Verify the user has an ACTIVE membership in the target company
    const [membership] = await db
      .select({
        primaryRole: companyMemberships.primaryRole,
        scopeLevel: companyMemberships.scopeLevel,
        status: companyMemberships.status,
      })
      .from(companyMemberships)
      .where(
        and(
          eq(companyMemberships.companyId, targetCompanyId),
          eq(companyMemberships.userId, ctx.session.userId),
          eq(companyMemberships.status, "ACTIVE")
        )
      )
      .limit(1)

    if (!membership) {
      return NextResponse.json(
        { error: "No active membership in target company", code: "NO_MEMBERSHIP" },
        { status: 403 }
      )
    }

    const now = Math.floor(Date.now() / 1000)
    const ttl = getSessionTTL(ctx.session.securityLevel)
    const newSessionId = crypto.randomUUID()

    const newSession: PRVSession = {
      ...ctx.session,
      sessionId: newSessionId,
      companyId: targetCompanyId,
      role: membership.primaryRole as SystemRole,
      scopeLevel: SCOPE_MAP[membership.scopeLevel] ?? "SCOPE_RECORD",
      createdAt: now,
      lastActiveAt: now,
      expiresAt: now + ttl,
    }

    // Create the new session before revoking the old one to avoid a gap
    await createSession(newSession)
    await revokeSession(ctx.session.sessionId)

    void writeAuditLog({
      companyId: targetCompanyId,
      actorId: ctx.session.userId,
      sessionId: newSessionId,
      action: "auth.context.switch",
      entityType: "session",
      entityId: newSessionId,
      payload: { fromCompanyId: ctx.session.companyId, toCompanyId: targetCompanyId },
      method: "POST",
      path: "/api/auth/context/switch",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    const res = NextResponse.json({
      companyId: targetCompanyId,
      role: newSession.role,
      scopeLevel: newSession.scopeLevel,
    })

    res.cookies.set(PRV_SESSION_COOKIE, newSessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ttl,
      path: "/",
    })

    return res
  }
)
