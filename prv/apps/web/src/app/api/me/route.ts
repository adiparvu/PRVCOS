import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db } from "@prv/db"
import { users } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

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
