import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db } from "@prv/db"
import { users } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import type { GateContext } from "@prv/auth"
import { runErasurePipeline } from "@/lib/gdpr-erasure"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// GET /api/me — current user profile
export const GET = withGates(
  { action: "user.profile.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const [user] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        jobTitle: users.jobTitle,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        skills: users.skills,
        role: users.role,
        locale: users.locale,
        timezone: users.timezone,
        mfaEnabled: users.mfaEnabled,
        securityLevel: users.securityLevel,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.id, ctx.session.userId), eq(users.companyId, ctx.session.companyId)))
      .limit(1)

    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

    return NextResponse.json({
      user: {
        ...user,
        fullName: `${user.firstName} ${user.lastName}`,
        companyId: ctx.session.companyId,
        memberSince: user.createdAt.toISOString(),
      },
    })
  }
)

const patchSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(30).optional(),
  bio: z.string().max(500).optional(),
  locale: z.string().max(10).optional(),
  timezone: z.string().max(60).optional(),
  skills: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
})

// PATCH /api/me — update own profile
export const PATCH = withGates(
  { action: "user.profile.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const patch = parsed.data
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    await db
      .update(users)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(users.id, ctx.session.userId), eq(users.companyId, ctx.session.companyId)))

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "user.profile.update",
      entityType: "user",
      entityId: ctx.session.userId,
      payload: patch,
      method: "PATCH",
      path: "/api/me",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ ok: true })
  }
)

// ─── DELETE /api/me — self-service account deletion ──────────────────────────
//
// Apple App Store Guideline 5.1.1(v) requires any app that supports account
// creation to let the user initiate deletion of their own account from inside
// the app. This is the self-scoped counterpart of the admin GDPR workflow: it
// runs the SAME anonymization pipeline, but keyed strictly to the caller's own
// session — there is no target id in the body, so it can never erase anyone
// else. Employment/payroll/audit history is retained in anonymized form for
// legal retention (see lib/gdpr-erasure.ts).

export const DELETE = withGates(
  { action: "user.profile.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { userId, companyId } = ctx.session

    const [existing] = await db
      .select({ id: users.id, deletedAt: users.deletedAt })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.companyId, companyId)))
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (existing.deletedAt)
      return NextResponse.json({ error: "Account already deleted" }, { status: 409 })

    const erasureLog = await runErasurePipeline(userId, companyId)

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "user.account.self_delete",
      entityType: "user",
      entityId: userId,
      payload: { erasureLog },
      method: "DELETE",
      path: "/api/me",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
