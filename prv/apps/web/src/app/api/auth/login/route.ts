import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  createSession,
  checkLockout,
  recordFailedAttempt,
  clearFailedAttempts,
  writeAuditLog,
  logSecurityEvent,
} from "@prv/auth"
import { getRedis } from "@prv/cache"
import type { PRVSession } from "@prv/auth"
import { db } from "@prv/db"
import { users, userDevices } from "@prv/db/schema"
import { isDeviceTrusted } from "@/lib/device-trust"
import { eq, and } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const PRV_SESSION_COOKIE = "prv_session"

const SESSION_TTL: Record<string, number> = {
  L2: 8 * 3600,
  L3: 4 * 3600,
  L4: 2 * 3600,
  L5: 3600,
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  )
}

// POST /api/auth/login — Credential validation + PRV session creation.
// Enforces brute-force lockout before forwarding credentials to Supabase.
// On success: creates a Redis-backed PRVSession and sets the prv_session cookie.
// This replaces direct client-side supabase.signInWithPassword() calls so that
// every login attempt is checked against the lockout table and audit-logged.
export async function POST(req: NextRequest) {
  const ipAddress = getIp(req)
  const userAgent = req.headers.get("user-agent") ?? ""

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 422 }
    )
  }

  const { email, password } = parsed.data

  // Gate: check brute-force lockout before touching Supabase
  const lockout = await checkLockout(email)
  if (lockout.locked) {
    const retryAfter = lockout.lockedUntil
      ? Math.ceil((lockout.lockedUntil.getTime() - Date.now()) / 1000)
      : 900
    return NextResponse.json(
      {
        error: "Account temporarily locked due to too many failed attempts.",
        code: "ACCOUNT_LOCKED",
        retryAfterSeconds: retryAfter,
        lockedUntil: lockout.lockedUntil?.toISOString(),
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    )
  }

  // Authenticate with Supabase
  const supabase = await createSupabaseServerClient()
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

  if (authError) {
    // Record failed attempt (increments counter, may trigger lockout)
    const status = await recordFailedAttempt(email, { ipAddress, userAgent })

    void logSecurityEvent({
      companyId: "00000000-0000-0000-0000-000000000000", // unknown at this stage
      actorId: "00000000-0000-0000-0000-000000000000",
      eventType: "auth_failure",
      severity: status.locked ? "high" : "medium",
      metadata: {
        email,
        failedAttempts: status.failedAttempts,
        locked: status.locked,
        reason: authError.message,
      },
      ipAddress,
      userAgent,
      path: "/api/auth/login",
    })

    if (status.locked) {
      const retryAfter = status.lockedUntil
        ? Math.ceil((status.lockedUntil.getTime() - Date.now()) / 1000)
        : 900
      return NextResponse.json(
        {
          error: "Account locked after too many failed attempts.",
          code: "ACCOUNT_LOCKED",
          retryAfterSeconds: retryAfter,
          lockedUntil: status.lockedUntil?.toISOString(),
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      )
    }

    return NextResponse.json(
      {
        error: "Invalid email or password.",
        code: "INVALID_CREDENTIALS",
        attemptsRemaining: Math.max(0, 5 - status.failedAttempts),
      },
      { status: 401 }
    )
  }

  // Supabase auth succeeded — load PRV user
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser()

  if (!supabaseUser) {
    return NextResponse.json({ error: "Session error", code: "SESSION_ERROR" }, { status: 500 })
  }

  const [prvUser] = await db
    .select({
      id: users.id,
      companyId: users.companyId,
      role: users.role,
      scopeLevel: users.scopeLevel,
      securityLevel: users.securityLevel,
      mfaEnabled: users.mfaEnabled,
      status: users.status,
    })
    .from(users)
    .where(and(eq(users.supabaseId, supabaseUser.id), eq(users.isActive, true)))
    .limit(1)

  if (!prvUser) {
    // Supabase user exists but no PRV record — admin must provision user first
    await supabase.auth.signOut()
    return NextResponse.json(
      {
        error: "User not provisioned. Contact your administrator.",
        code: "USER_NOT_PROVISIONED",
      },
      { status: 403 }
    )
  }

  if (prvUser.status === "suspended" || prvUser.status === "offboarded") {
    await supabase.auth.signOut()
    return NextResponse.json(
      { error: "Account is inactive.", code: "ACCOUNT_INACTIVE" },
      { status: 403 }
    )
  }

  // Clear lockout on successful login
  await clearFailedAttempts(email)

  // Check if MFA is required
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  const needsMfa = aalData?.nextLevel === "aal2" && aalData.nextLevel !== aalData.currentLevel
  const mfaVerified = aalData?.currentLevel === "aal2"

  if (needsMfa) {
    // Trusted-device MFA skip: a device the user previously verified and marked
    // trusted may sign in without a second factor until its trust window lapses.
    const headerDeviceId = req.headers.get("x-device-id")
    let deviceTrusted = false
    if (headerDeviceId && /^[0-9a-fA-F-]{36}$/.test(headerDeviceId)) {
      const [dev] = await db
        .select({ isTrusted: userDevices.isTrusted, trustExpiresAt: userDevices.trustExpiresAt })
        .from(userDevices)
        .where(and(eq(userDevices.userId, prvUser.id), eq(userDevices.deviceId, headerDeviceId)))
        .limit(1)
      deviceTrusted = isDeviceTrusted(dev ?? null, new Date())
      if (deviceTrusted) {
        await db
          .update(userDevices)
          .set({ lastSeenAt: new Date() })
          .where(and(eq(userDevices.userId, prvUser.id), eq(userDevices.deviceId, headerDeviceId)))
      }
    }

    if (!deviceTrusted) {
      const factors = await supabase.auth.mfa.listFactors()
      const totpFactor = factors.data?.totp?.[0]

      // Bridge Supabase session to the MFA verify route via Redis (300s TTL)
      const {
        data: { session: sbSession },
      } = await supabase.auth.getSession()
      if (sbSession && totpFactor) {
        const redis = getRedis()
        await redis.set(
          `mfa_pending:${totpFactor.id}`,
          JSON.stringify({
            accessToken: sbSession.access_token,
            refreshToken: sbSession.refresh_token,
            supabaseUserId: supabaseUser.id,
          }),
          { ex: 300 }
        )
      }

      return NextResponse.json(
        {
          requiresMfa: true,
          factorId: totpFactor?.id,
          code: "MFA_REQUIRED",
        },
        { status: 200 }
      )
    }
  }

  // Create PRV session
  const now = Math.floor(Date.now() / 1000)
  const ttl = SESSION_TTL[prvUser.securityLevel] ?? SESSION_TTL["L2"]!
  const sessionId = crypto.randomUUID()

  const deviceId: string =
    req.headers.get("x-device-id") ??
    (await crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(userAgent + prvUser.id))
      .then((buf) =>
        Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
          .slice(0, 16)
      ))

  const session: PRVSession = {
    sessionId,
    userId: prvUser.id,
    companyId: prvUser.companyId,
    role: prvUser.role,
    scopeLevel: prvUser.scopeLevel,
    securityLevel: prvUser.securityLevel,
    mfaVerified,
    deviceId,
    createdAt: now,
    expiresAt: now + ttl,
    lastActiveAt: now,
  }

  await createSession(session)

  void db
    .update(users)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, prvUser.id))

  void writeAuditLog({
    companyId: prvUser.companyId,
    actorId: prvUser.id,
    sessionId,
    action: "auth.login",
    entityType: "session",
    entityId: sessionId,
    method: "POST",
    path: "/api/auth/login",
    ipAddress,
    userAgent,
  })

  const res = NextResponse.json(
    {
      sessionId,
      userId: prvUser.id,
      companyId: prvUser.companyId,
      role: prvUser.role,
      mfaVerified,
      requiresMfa: false,
    },
    { status: 201 }
  )

  res.cookies.set(PRV_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ttl,
  })

  return res
}
