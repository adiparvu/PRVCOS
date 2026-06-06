import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createSession, writeAuditLog, logSecurityEvent } from "@prv/auth"
import type { PRVSession } from "@prv/auth"
import { db } from "@prv/db"
import { users } from "@prv/db/schema"
import { eq, and } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const PRV_SESSION_COOKIE = "prv_session"

// TTL per security level (seconds)
const SESSION_TTL: Record<string, number> = {
  L2: 8 * 3600,
  L3: 4 * 3600,
  L4: 2 * 3600,
  L5: 3600,
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  )
}

// POST /api/auth/session — Hydrate a PRV session from a valid Supabase session.
// Called immediately after any successful Supabase auth event (password login,
// OAuth callback, magic link callback, TOTP verification).
// Reads the Supabase session from cookies, looks up the PRV user, creates a
// Redis-backed PRVSession, and sets the prv_session HttpOnly cookie.
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: "Unauthenticated", code: "UNAUTHENTICATED" }, { status: 401 })
  }

  // Derive MFA assurance from Supabase AAL
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  const mfaVerified = aalData?.currentLevel === "aal2"

  // Look up PRV user by Supabase ID
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
    .where(and(eq(users.supabaseId, user.id), eq(users.isActive, true)))
    .limit(1)

  if (!prvUser) {
    return NextResponse.json(
      {
        error: "User not provisioned. Contact your administrator.",
        code: "USER_NOT_PROVISIONED",
      },
      { status: 403 }
    )
  }

  if (prvUser.status === "suspended" || prvUser.status === "offboarded") {
    const ipAddress = getIp(req)
    void logSecurityEvent({
      companyId: prvUser.companyId,
      actorId: prvUser.id,
      eventType: "auth_failure",
      severity: "high",
      metadata: { reason: "account_inactive", status: prvUser.status },
      ipAddress,
      userAgent: req.headers.get("user-agent") ?? "",
      path: "/api/auth/session",
    })
    return NextResponse.json(
      { error: "Account is inactive. Contact your administrator.", code: "ACCOUNT_INACTIVE" },
      { status: 403 }
    )
  }

  const now = Math.floor(Date.now() / 1000)
  const ttl = SESSION_TTL[prvUser.securityLevel] ?? SESSION_TTL["L2"]!
  const sessionId = crypto.randomUUID()
  const ipAddress = getIp(req)
  const userAgent = req.headers.get("user-agent") ?? ""
  // Device fingerprint: prefer explicit header, fall back to UA-based fingerprint
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

  // Update last login timestamp (fire-and-forget — non-blocking)
  void db
    .update(users)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, prvUser.id))

  void writeAuditLog({
    companyId: prvUser.companyId,
    actorId: prvUser.id,
    sessionId,
    action: "auth.session.create",
    entityType: "session",
    entityId: sessionId,
    method: "POST",
    path: "/api/auth/session",
    ipAddress,
    userAgent,
  })

  const body = {
    sessionId,
    userId: prvUser.id,
    companyId: prvUser.companyId,
    role: prvUser.role,
    mfaVerified,
  }

  const res = NextResponse.json(body, { status: 201 })
  res.cookies.set(PRV_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ttl,
  })

  return res
}

// DELETE /api/auth/session — Destroy the PRV session (called from logout flow).
export async function DELETE(req: NextRequest) {
  const sessionId = req.cookies.get(PRV_SESSION_COOKIE)?.value
  if (sessionId) {
    const { revokeSession } = await import("@prv/auth")
    await revokeSession(sessionId).catch(() => undefined)
  }

  const res = NextResponse.json({ success: true })
  res.cookies.delete(PRV_SESSION_COOKIE)
  return res
}
