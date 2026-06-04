import { getRedis, cacheKey, getSessionTTL } from "@prv/cache"
import type { PRVSession } from "./types"
import { AuthErrors } from "./errors"

export async function getSession(sessionId: string): Promise<PRVSession> {
  const redis = getRedis()
  const key = cacheKey.session(sessionId)
  const raw = await redis.get<PRVSession>(key)

  if (!raw) {
    throw AuthErrors.sessionNotFound()
  }

  const now = Math.floor(Date.now() / 1000)
  if (raw.expiresAt < now) {
    await redis.del(key)
    throw AuthErrors.sessionExpired()
  }

  return raw
}

export async function createSession(session: PRVSession): Promise<void> {
  const redis = getRedis()
  const ttl = getSessionTTL(session.securityLevel)
  const key = cacheKey.session(session.sessionId)

  await redis.set(key, session, { ex: ttl })

  // Track user's active sessions for bulk revocation
  const userKey = cacheKey.userSessions(session.userId)
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
