import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"
import { createSession, writeAuditLog, logSecurityEvent } from "@prv/auth"
import type { PRVSession, SystemRole, ScopeLevel } from "@prv/auth"
import { db } from "@prv/db"
import { users, roles, userRoleAssignments } from "@prv/db/schema"
import { eq, and, isNull } from "drizzle-orm"
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

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  companyId: z.string().uuid("Invalid company ID"),
  // Invite token is required — direct self-signup without invitation is not allowed
  inviteToken: z.string().min(1, "Invite token required"),
})

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  )
}

// POST /api/auth/signup — Invitation-gated user registration.
// Validates invite token, creates Supabase user, provisions PRV user record,
// assigns the default role for the company, and creates an initial session.
// Direct self-signup is disabled — users must be invited by an admin.
export async function POST(req: NextRequest) {
  const ipAddress = getIp(req)
  const userAgent = req.headers.get("user-agent") ?? ""

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = signupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 422 }
    )
  }

  const { email, password, firstName, lastName, companyId, inviteToken } = parsed.data

  // Verify invite token (stored in auth.users metadata by admin when creating invitation)
  const admin = await createSupabaseAdminClient()
  const { data: userList } = await admin.auth.admin.listUsers()
  const inviteUserRecord = userList?.users?.find(
    (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
  )

  if (!inviteUserRecord) {
    return NextResponse.json(
      { error: "Invalid or expired invitation.", code: "INVALID_INVITE" },
      { status: 400 }
    )
  }

  const storedToken = inviteUserRecord.user_metadata?.["invite_token"] as string | undefined
  const invitedCompanyId = inviteUserRecord.user_metadata?.["company_id"] as string | undefined

  if (!storedToken || storedToken !== inviteToken) {
    void logSecurityEvent({
      companyId,
      actorId: "00000000-0000-0000-0000-000000000000",
      eventType: "auth_failure",
      severity: "high",
      metadata: { email, reason: "invalid_invite_token" },
      ipAddress,
      userAgent,
      path: "/api/auth/signup",
    })
    return NextResponse.json(
      { error: "Invalid or expired invitation.", code: "INVALID_INVITE" },
      { status: 400 }
    )
  }

  if (invitedCompanyId && invitedCompanyId !== companyId) {
    return NextResponse.json(
      { error: "Invitation is for a different company.", code: "COMPANY_MISMATCH" },
      { status: 400 }
    )
  }

  // Update Supabase user password (they were pre-created with invite token)
  const { error: updateError } = await admin.auth.admin.updateUserById(inviteUserRecord.id, {
    password,
    email_confirm: true,
    user_metadata: {
      ...inviteUserRecord.user_metadata,
      invite_token: null, // consume the token
      onboarding_complete: true,
    },
  })

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to activate account.", code: "ACTIVATION_FAILED" },
      { status: 500 }
    )
  }

  // Check if PRV user already exists (idempotency)
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.supabaseId, inviteUserRecord.id), eq(users.isActive, true)))
    .limit(1)

  let prvUserId: string

  if (existingUser) {
    prvUserId = existingUser.id
    // Update status from onboarding → active
    await db
      .update(users)
      .set({ status: "active", firstName, lastName, updatedAt: new Date() })
      .where(eq(users.id, existingUser.id))
  } else {
    // Provision new PRV user
    const [newUser] = await db
      .insert(users)
      .values({
        companyId,
        supabaseId: inviteUserRecord.id,
        email,
        firstName,
        lastName,
        role: "worker" as SystemRole, // minimal default; admin will elevate
        scopeLevel: "SCOPE_RECORD" as ScopeLevel,
        securityLevel: "L2",
        status: "active",
        mfaEnabled: false,
      })
      .returning({ id: users.id })

    if (!newUser) {
      return NextResponse.json(
        { error: "Failed to provision user.", code: "PROVISION_FAILED" },
        { status: 500 }
      )
    }

    prvUserId = newUser.id

    // Assign the default "worker" system role
    const [workerRole] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.slug, "worker"), isNull(roles.companyId)))
      .limit(1)

    if (workerRole) {
      await db.insert(userRoleAssignments).values({
        userId: prvUserId,
        companyId,
        roleId: workerRole.id,
        reason: "Initial role assignment on signup",
      })
    }
  }

  // Sign in with Supabase to create a session
  const supabase = await createSupabaseServerClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) {
    return NextResponse.json(
      {
        error: "Account created but login failed. Please sign in.",
        code: "LOGIN_AFTER_SIGNUP_FAILED",
      },
      { status: 201 }
    )
  }

  // Create PRV session
  const now = Math.floor(Date.now() / 1000)
  const ttl = SESSION_TTL["L2"]!
  const sessionId = crypto.randomUUID()
  const deviceId: string =
    req.headers.get("x-device-id") ??
    (await crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(userAgent + prvUserId))
      .then((buf) =>
        Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
          .slice(0, 16)
      ))

  const session: PRVSession = {
    sessionId,
    userId: prvUserId,
    companyId,
    role: "worker",
    scopeLevel: "SCOPE_RECORD",
    securityLevel: "L2",
    mfaVerified: false,
    deviceId,
    createdAt: now,
    expiresAt: now + ttl,
    lastActiveAt: now,
  }

  await createSession(session)

  void writeAuditLog({
    companyId,
    actorId: prvUserId,
    sessionId,
    action: "auth.signup",
    entityType: "user",
    entityId: prvUserId,
    method: "POST",
    path: "/api/auth/signup",
    ipAddress,
    userAgent,
  })

  const res = NextResponse.json(
    { sessionId, userId: prvUserId, companyId, role: "worker" },
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
