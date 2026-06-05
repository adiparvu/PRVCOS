import { db } from "@prv/db"
import { authLockouts } from "@prv/db/schema"
import { eq } from "drizzle-orm"
import { logSecurityEvent } from "./security-events"

// ─── Lockout policy ────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 5
const UNLOCK_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

// Progressive lockout durations after each threshold breach (minutes)
const LOCKOUT_LADDER_MINUTES = [15, 60, 360, 1440] // 15m → 1h → 6h → 24h

function lockoutDurationMs(failedAttempts: number): number {
  const idx = Math.max(
    0,
    Math.min(
      Math.floor((failedAttempts - MAX_ATTEMPTS) / MAX_ATTEMPTS),
      LOCKOUT_LADDER_MINUTES.length - 1
    )
  )
  return LOCKOUT_LADDER_MINUTES[idx]! * 60 * 1000
}

async function sha256hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// ─── Public API ────────────────────────────────────────────────────────────

export interface LockoutStatus {
  locked: boolean
  lockedUntil?: Date
  failedAttempts: number
}

/**
 * Check current lockout state for an identifier (email or userId).
 * Called before a login attempt.
 */
export async function checkLockout(identifier: string): Promise<LockoutStatus> {
  const [row] = await db
    .select({
      failedAttempts: authLockouts.failedAttempts,
      lockedUntil: authLockouts.lockedUntil,
    })
    .from(authLockouts)
    .where(eq(authLockouts.identifier, identifier))
    .limit(1)

  if (!row) return { locked: false, failedAttempts: 0 }

  const attempts = parseInt(row.failedAttempts, 10)
  if (row.lockedUntil && row.lockedUntil > new Date()) {
    return { locked: true, lockedUntil: row.lockedUntil, failedAttempts: attempts }
  }

  return { locked: false, failedAttempts: attempts }
}

/**
 * Record a failed login attempt. Returns the resulting lockout status.
 * If MAX_ATTEMPTS is reached, the account is locked and a security event is fired.
 */
export async function recordFailedAttempt(
  identifier: string,
  meta?: { ipAddress?: string; userAgent?: string; companyId?: string }
): Promise<LockoutStatus> {
  const now = new Date()

  const [existing] = await db
    .select()
    .from(authLockouts)
    .where(eq(authLockouts.identifier, identifier))
    .limit(1)

  const prevAttempts = existing ? parseInt(existing.failedAttempts, 10) : 0
  const newAttempts = prevAttempts + 1

  let lockedUntil: Date | null = null
  if (newAttempts >= MAX_ATTEMPTS) {
    lockedUntil = new Date(now.getTime() + lockoutDurationMs(newAttempts))
  }

  if (existing) {
    await db
      .update(authLockouts)
      .set({
        failedAttempts: String(newAttempts),
        lastFailedAt: now,
        lockedUntil: lockedUntil,
        updatedAt: now,
      })
      .where(eq(authLockouts.identifier, identifier))
  } else {
    await db.insert(authLockouts).values({
      identifier,
      failedAttempts: String(newAttempts),
      lastFailedAt: now,
      lockedUntil: lockedUntil,
    })
  }

  if (lockedUntil && meta?.companyId) {
    void logSecurityEvent({
      companyId: meta.companyId,
      actorId: identifier,
      eventType: "account_locked",
      severity: "high",
      metadata: { identifier, attempts: newAttempts, lockedUntil: lockedUntil.toISOString() },
      ipAddress: meta.ipAddress ?? "unknown",
      userAgent: meta.userAgent ?? "",
      path: "/api/auth/login",
    })
  }

  return {
    locked: !!lockedUntil,
    lockedUntil: lockedUntil ?? undefined,
    failedAttempts: newAttempts,
  }
}

/**
 * Clear the failed-attempt counter on successful login.
 */
export async function clearFailedAttempts(identifier: string): Promise<void> {
  await db
    .update(authLockouts)
    .set({ failedAttempts: "0", lockedUntil: null, updatedAt: new Date() })
    .where(eq(authLockouts.identifier, identifier))
}

/**
 * Generate a one-time unlock token for the given identifier.
 * The plain token is returned to the caller (to embed in the email link);
 * only its SHA-256 hash is stored in the DB.
 */
export async function issueUnlockToken(identifier: string): Promise<string> {
  const token = crypto.randomUUID() + crypto.randomUUID() // 72 hex chars of entropy
  const tokenHash = await sha256hex(token)
  const expiresAt = new Date(Date.now() + UNLOCK_TOKEN_TTL_MS)

  await db
    .update(authLockouts)
    .set({ unlockToken: tokenHash, unlockTokenExpiresAt: expiresAt, updatedAt: new Date() })
    .where(eq(authLockouts.identifier, identifier))

  return token
}

/**
 * Consume an unlock token. Clears the lockout on success, throws on invalid/expired.
 */
export async function consumeUnlockToken(token: string): Promise<void> {
  const tokenHash = await sha256hex(token)

  const [row] = await db
    .select()
    .from(authLockouts)
    .where(eq(authLockouts.unlockToken, tokenHash))
    .limit(1)

  if (!row) throw new Error("INVALID_UNLOCK_TOKEN")
  if (!row.unlockTokenExpiresAt || row.unlockTokenExpiresAt < new Date()) {
    throw new Error("UNLOCK_TOKEN_EXPIRED")
  }

  await db
    .update(authLockouts)
    .set({
      failedAttempts: "0",
      lockedUntil: null,
      unlockToken: null,
      unlockTokenExpiresAt: null,
      unlockedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(authLockouts.identifier, row.identifier))
}
