import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { writeAuditLog } from "@prv/auth"
import { getRedis, cacheKey } from "@prv/cache"
import type { PRVSession } from "@prv/auth"
import { db } from "@prv/db"
import { users, mfaBackupCodes } from "@prv/db/schema"
import { auditLogs } from "@prv/db/schema"
import { eq, isNull, and, like, desc } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// GET /api/mobile/security — current user's security posture:
// MFA status, backup codes remaining, active sessions, recent auth activity.
export const GET = withMobileAuth(async (_req: NextRequest, ctx) => {
  const redis = getRedis()

  const [userRow, backupCodeRows, sessionIds, recentLogs] = await Promise.all([
    db
      .select({ mfaEnabled: users.mfaEnabled })
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1),
    db
      .select({ id: mfaBackupCodes.id })
      .from(mfaBackupCodes)
      .where(and(eq(mfaBackupCodes.userId, ctx.userId), isNull(mfaBackupCodes.usedAt))),
    redis.smembers(cacheKey.userSessions(ctx.userId)),
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(and(eq(auditLogs.actorId, ctx.userId), like(auditLogs.action, "auth.%")))
      .orderBy(desc(auditLogs.createdAt))
      .limit(5),
  ])

  // Hydrate all sessions in parallel; filter out expired/missing
  const rawSessions = await Promise.all(
    sessionIds.map((id) => redis.get<PRVSession>(cacheKey.session(id)))
  )

  const sessions = sessionIds
    .map((id, i) => {
      const s = rawSessions[i]
      if (!s) return null
      return {
        sessionId: id,
        deviceId: s.deviceId,
        createdAt: s.createdAt,
        lastActiveAt: s.lastActiveAt,
        expiresAt: s.expiresAt,
        isCurrent: id === ctx.sessionId,
      }
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a, b) => b.lastActiveAt - a.lastActiveAt)

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "mobile.security.view",
    entityType: "user",
    entityId: ctx.userId,
    method: "GET",
    path: "/api/mobile/security",
    ipAddress: undefined,
    userAgent: undefined,
  })

  return NextResponse.json({
    mfa: {
      enabled: userRow[0]?.mfaEnabled ?? false,
      backupCodesRemaining: backupCodeRows.length,
    },
    sessions,
    recentActivity: recentLogs.map((log) => ({
      id: log.id,
      action: log.action,
      ipAddress: log.ipAddress ?? null,
      createdAt: log.createdAt?.toISOString() ?? null,
    })),
  })
})
