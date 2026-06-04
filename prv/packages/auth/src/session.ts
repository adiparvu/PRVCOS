import { getRedis, cacheKey, getSessionTTL, MaxSessions } from "@prv/cache"
import { z } from "zod"
import type { PRVSession } from "./types"
import { AuthErrors } from "./errors"

// Runtime schema — rejects malformed/stale Redis payloads (P-06)
const PRVSessionSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().uuid(),
  companyId: z.string().uuid(),
  role: z.string().min(1),
  scopeLevel: z.enum([
    "SCOPE_RECORD",
    "SCOPE_TEAM",
    "SCOPE_DEPARTMENT",
    "SCOPE_STORE",
    "SCOPE_REGION",
    "SCOPE_COMPANY",
    "SCOPE_GROUP",
    "SCOPE_PLATFORM",
    "SCOPE_GLOBAL",
  ]),
  securityLevel: z.enum(["L2", "L3", "L4", "L5"]),
  mfaVerified: z.boolean(),
  deviceId: z.string(),
  createdAt: z.number(),
  expiresAt: z.number(),
  lastActiveAt: z.number(),
})

export async function getSession(sessionId: string): Promise<PRVSession> {
  const redis = getRedis()
  const key = cacheKey.session(sessionId)
  const raw = await redis.get<unknown>(key)

  if (!raw) throw AuthErrors.sessionNotFound()

  const parsed = PRVSessionSchema.safeParse(raw)
  if (!parsed.success) {
    // Malformed/stale session data — treat as not found and clean up
    await redis.del(key)
    throw AuthErrors.sessionNotFound()
  }

  const session = parsed.data as PRVSession
  const now = Math.floor(Date.now() / 1000)
  if (session.expiresAt < now) {
    await redis.del(key)
    throw AuthErrors.sessionExpired()
  }

  return session
}

export async function createSession(session: PRVSession): Promise<void> {
  const redis = getRedis()
  const ttl = getSessionTTL(session.securityLevel)
  const key = cacheKey.session(session.sessionId)
  const userKey = cacheKey.userSessions(session.userId)

  // Enforce max concurrent sessions per security level (P-11)
  const maxAllowed = MaxSessions[session.securityLevel]
  const existing = await redis.smembers(userKey)
  if (existing.length >= maxAllowed) {
    // Revoke oldest sessions to stay within the limit
    const toRevoke = existing.slice(0, existing.length - maxAllowed + 1)
    const pipeline = redis.pipeline()
    for (const id of toRevoke) {
      pipeline.del(cacheKey.session(id))
      pipeline.srem(userKey, id)
    }
    await pipeline.exec()
  }

  await redis.set(key, session, { ex: ttl })
  await redis.sadd(userKey, session.sessionId)
  await redis.expire(userKey, ttl)
}

export async function revokeSession(sessionId: string): Promise<void> {
  const redis = getRedis()
  const session = await redis.get<PRVSession>(cacheKey.session(sessionId))
  if (session) {
    await redis.del(cacheKey.session(sessionId))
    await redis.srem(cacheKey.userSessions(session.userId), sessionId)
  }
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  const redis = getRedis()
  const userKey = cacheKey.userSessions(userId)
  const sessionIds = await redis.smembers(userKey)

  const pipeline = redis.pipeline()
  for (const id of sessionIds) {
    pipeline.del(cacheKey.session(id))
  }
  pipeline.del(userKey)
  await pipeline.exec()
}

export async function refreshSession(sessionId: string): Promise<PRVSession> {
  const redis = getRedis()
  const session = await getSession(sessionId)
  const ttl = getSessionTTL(session.securityLevel)
  const now = Math.floor(Date.now() / 1000)

  const updated: PRVSession = {
    ...session,
    lastActiveAt: now,
    expiresAt: now + ttl,
  }

  await redis.set(cacheKey.session(sessionId), updated, { ex: ttl })
  return updated
}
