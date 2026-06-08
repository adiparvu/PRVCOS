import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { revokeSession, writeAuditLog } from "@prv/auth"
import { getRedis, cacheKey } from "@prv/cache"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// DELETE /api/mobile/security/sessions — revoke all sessions except the current one.
export const DELETE = withMobileAuth(async (_req: NextRequest, ctx) => {
  const redis = getRedis()
  const sessionIds = await redis.smembers(cacheKey.userSessions(ctx.userId))

  const others = sessionIds.filter((id) => id !== ctx.sessionId)
  await Promise.all(others.map((id) => revokeSession(id)))

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "mobile.security.sessions.revoke_all",
    entityType: "user",
    entityId: ctx.userId,
    method: "DELETE",
    path: "/api/mobile/security/sessions",
    ipAddress: null,
    userAgent: null,
  })

  return NextResponse.json({ revokedCount: others.length })
})
