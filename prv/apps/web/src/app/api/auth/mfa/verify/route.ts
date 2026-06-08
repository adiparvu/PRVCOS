import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createSession, writeAuditLog, logSecurityEvent } from "@prv/auth"
import { getRedis } from "@prv/cache"
import type { PRVSession } from "@prv/auth"
import { db } from "@prv/db"
import { users } from "@prv/db/schema"
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

const verifySchema = z.object({
  mfaToken: z.string().min(1),
  code: z.string().length(6).regex(/^\d+$/),
})

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  )
}

// POST /api/auth/mfa/verify — Complete MFA login flow.
// Retrieves the Supabase session bridged from /api/auth/login via Redis,
// restores it, verifies the TOTP code, then creates a PRVSession with mfaVerified=true.
export async function POST(req: NextRequest) {
  const ipAddress = getIp(req)
  const userAgent = req.headers.get("user-agent") ?? ""

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = verifySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 422 }
    )
  }

  const { mfaToken: factorId, code } = parsed.data

  // Retrieve bridged Supabase session from Redis
  const redis = getRedis()
  const pending = await redis.get<string>(`mfa_pending:${factorId}`)
  if (!pending) {
    return NextResponse.json(
      {
        error: "MFA session expired or invalid. Please log in again.",
        code: "MFA_SESSION_EXPIRED",
      },
      { status: 401 }
    )
  }

  let bridgeData: { accessToken: string; refreshToken: string; supabaseUserId: string }
  try {
    bridgeData = JSON.parse(pending as string)
  } catch {
    return NextResponse.json(
      { error: "MFA session corrupted.", code: "MFA_SESSION_ERROR" },
      { status: 500 }
    )
  }

  // Restore Supabase session
  const supabase = await createSupabaseServerClient()
  const { error: sessionErr } = await supabase.auth.setSession({
    access_token: bridgeData.accessToken,
    refresh_token: bridgeData.refreshToken,
  })
  if (sessionErr) {
    return NextResponse.json(
      { error: "Failed to restore session. Please log in again.", code: "SESSION_RESTORE_FAILED" },
      { status: 401 }
    )
  }

  // Challenge + verify TOTP
  const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
    factorId,
  })
  if (challengeErr || !challengeData) {
    return NextResponse.json(
      { error: challengeErr?.message ?? "MFA challenge failed", code: "MFA_CHALLENGE_FAILED" },
      { status: 400 }
    )
  }

  const { error: verifyErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  })

  if (verifyErr) {
    void logSecurityEvent({
      companyId: "00000000-0000-0000-0000-000000000000",
      actorId: bridgeData.supabaseUserId,
      eventType: "auth_failure",
      severity: "medium",
      metadata: { reason: "invalid_totp", factorId },
      ipAddress,
      userAgent,
      path: "/api/auth/mfa/verify",
    })
    return NextResponse.json(
      { error: "Invalid authentication code.", code: "MFA_FAILED" },
      { status: 401 }
    )
  }

  // Clean up Redis bridge
  void redis.del(`mfa_pending:${factorId}`)

  // Load PRV user
  const [prvUser] = await db
    .select({
      id: users.id,
      companyId: users.companyId,
      role: users.role,
      scopeLevel: users.scopeLevel,
      securityLevel: users.securityLevel,
      status: users.status,
    })
    .from(users)
    .where(and(eq(users.supabaseId, bridgeData.supabaseUserId), eq(users.isActive, true)))
    .limit(1)

  if (!prvUser) {
    await supabase.auth.signOut()
    return NextResponse.json(
      { error: "User not provisioned. Contact your administrator.", code: "USER_NOT_PROVISIONED" },
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

  // Create PRV session with MFA verified
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
    mfaVerified: true,
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
    action: "auth.mfa.verify",
    entityType: "session",
    entityId: sessionId,
    method: "POST",
    path: "/api/auth/mfa/verify",
    ipAddress,
    userAgent,
  })

  const res = NextResponse.json(
    {
      sessionId,
      userId: prvUser.id,
      companyId: prvUser.companyId,
      role: prvUser.role,
      mfaVerified: true,
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
