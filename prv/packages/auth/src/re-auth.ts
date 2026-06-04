import { getRedis } from "@prv/cache"
import { AuthError } from "./errors"

const REAUTH_TTL = 900 // 15 minutes
const REAUTH_PREFIX = "reauth:"

function reauthKey(sessionId: string): string {
  return `${REAUTH_PREFIX}${sessionId}`
}

export function isReauthRequired(code: string): boolean {
  return code === "REAUTH_REQUIRED"
}

export async function confirmReauth(sessionId: string): Promise<void> {
  const redis = getRedis()
  await redis.set(reauthKey(sessionId), "1", { ex: REAUTH_TTL })
}

export async function checkReauth(sessionId: string): Promise<void> {
  const redis = getRedis()
  const confirmed = await redis.get(reauthKey(sessionId))
  if (!confirmed) {
    throw new AuthError(
      "Re-authentication required for this action",
      "REAUTH_REQUIRED" as never,
      403
    )
  }
}

export async function revokeReauth(sessionId: string): Promise<void> {
  const redis = getRedis()
  await redis.del(reauthKey(sessionId))
}
