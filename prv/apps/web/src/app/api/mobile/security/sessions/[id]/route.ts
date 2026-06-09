import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { revokeSession, writeAuditLog } from "@prv/auth"
import { getRedis, cacheKey } from "@prv/cache"
import type { PRVSession } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// DELETE /api/mobile/security/sessions/:id — revoke a specific session.
// Cannot revoke the current session (use /api/auth/logout for that).
export const DELETE = withMobileAuth(async (req: NextRequest, ctx) => {
  // Extract target session ID from URL path segment
  const targetId = req.nextUrl.pathname.split("/").pop() ?? ""

  if (!targetId) {
    return NextResponse.json(
      { error: "Missing session id.", code: "INVALID_OPERATION" },
      { status: 400 }
    )
  }

  if (targetId === ctx.sessionId) {
    return NextResponse.json(
      { error: "Cannot revoke current session. Use logout instead.", code: "INVALID_OPERATION" },
      { status: 400 }
    )
  }

  // Verify the target session belongs to this user before revoking
  const redis = getRedis()
  const target = await redis.get<PRVSession>(cacheKey.session(targetId))
  if (!target || target.userId !== ctx.userId) {
    return NextResponse.json({ error: "Session not found.", code: "NOT_FOUND" }, { status: 404 })
  }

  await revokeSession(targetId)

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "mobile.security.session.revoke",
    entityType: "session",
    entityId: targetId,
    method: "DELETE",
    path: `/api/mobile/security/sessions/${targetId}`,
    ipAddress: undefined,
    userAgent: undefined,
  })

  return NextResponse.json({ success: true })
})
