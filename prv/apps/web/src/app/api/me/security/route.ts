import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import { getRedis, cacheKey } from "@prv/cache"
import { db } from "@prv/db"
import { users, mfaBackupCodes, userDevices } from "@prv/db/schema"
import { auditLogs } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import type { GateContext, PRVSession } from "@prv/auth"
import { eq, and, isNull, like, desc } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface SecuritySession {
  sessionId: string
  deviceId: string | null
  deviceName: string | null
  platform: string | null
  createdAt: number
  lastActiveAt: number
  expiresAt: number
  isCurrent: boolean
}

export interface SecurityActivity {
  id: string
  action: string
  ipAddress: string | null
  createdAt: string | null
}

// GET /api/me/security — MFA status, active sessions, recent auth activity
export const GET = withGates(
  { action: "user.profile.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const redis = getRedis()

    const [userRow, backupCodeRows, sessionIds, recentLogs, devices] = await Promise.all([
      db
        .select({ mfaEnabled: users.mfaEnabled })
        .from(users)
        .where(eq(users.id, ctx.session.userId))
        .limit(1),
      db
        .select({ id: mfaBackupCodes.id })
        .from(mfaBackupCodes)
        .where(and(eq(mfaBackupCodes.userId, ctx.session.userId), isNull(mfaBackupCodes.usedAt))),
      redis.smembers(cacheKey.userSessions(ctx.session.userId)),
      db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          ipAddress: auditLogs.ipAddress,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .where(and(eq(auditLogs.actorId, ctx.session.userId), like(auditLogs.action, "auth.%")))
        .orderBy(desc(auditLogs.createdAt))
        .limit(5),
      db
        .select({
          deviceId: userDevices.deviceId,
          name: userDevices.name,
          platform: userDevices.platform,
        })
        .from(userDevices)
        .where(eq(userDevices.userId, ctx.session.userId)),
    ])

    const deviceMap = new Map(devices.map((d) => [d.deviceId, d]))

    const rawSessions = await Promise.all(
      sessionIds.map((id) => redis.get<PRVSession>(cacheKey.session(id)))
    )

    const sessions: SecuritySession[] = []
    for (let i = 0; i < sessionIds.length; i++) {
      const id = sessionIds[i]!
      const s = rawSessions[i]
      if (!s) continue
      const device = s.deviceId ? deviceMap.get(s.deviceId) : undefined
      sessions.push({
        sessionId: id,
        deviceId: s.deviceId ?? null,
        deviceName: device?.name ?? null,
        platform: device?.platform ?? null,
        createdAt: s.createdAt,
        lastActiveAt: s.lastActiveAt,
        expiresAt: s.expiresAt,
        isCurrent: id === ctx.session.sessionId,
      })
    }
    sessions.sort((a, b) => b.lastActiveAt - a.lastActiveAt)

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "user.security.view",
      entityType: "user",
      entityId: ctx.session.userId,
      method: "GET",
      path: "/api/me/security",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
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
  }
)

// DELETE /api/me/security?sessionId=xxx — revoke a session
export const DELETE = withGates(
  { action: "user.profile.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get("sessionId")
    if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
    if (sessionId === ctx.session.sessionId) {
      return NextResponse.json({ error: "Cannot revoke current session" }, { status: 400 })
    }

    const redis = getRedis()
    const existing = await redis.get<PRVSession>(cacheKey.session(sessionId))
    if (!existing || existing.userId !== ctx.session.userId) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    await Promise.all([
      redis.del(cacheKey.session(sessionId)),
      redis.srem(cacheKey.userSessions(ctx.session.userId), sessionId),
    ])

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "user.session.revoke",
      entityType: "session",
      entityId: sessionId,
      method: "DELETE",
      path: "/api/me/security",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ ok: true })
  }
)
