import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and, isNull } from "drizzle-orm"
import { db } from "@prv/db"
import { users, userPresence, socialProfiles } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import type { GateContext } from "@prv/auth"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// GET /api/people/[id] — full person detail (profile + presence + social links)
export const GET = withGates(
  { action: "presence.view_team", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const targetId = req.nextUrl.pathname.split("/").pop()

    if (!targetId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 })
    }

    const [person] = await db
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
        departmentId: users.departmentId,
        teamId: users.teamId,
        locale: users.locale,
        timezone: users.timezone,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.id, targetId), eq(users.companyId, ctx.session.companyId)))
      .limit(1)

    if (!person) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const [presence] = await db
      .select()
      .from(userPresence)
      .where(eq(userPresence.userId, targetId))
      .limit(1)

    const socialRows = await db
      .select({
        id: socialProfiles.id,
        platform: socialProfiles.platform,
        url: socialProfiles.url,
        displayName: socialProfiles.displayName,
        isPublic: socialProfiles.isPublic,
      })
      .from(socialProfiles)
      .where(
        and(
          eq(socialProfiles.userId, targetId),
          eq(socialProfiles.companyId, ctx.session.companyId)
        )
      )

    return NextResponse.json({
      person: {
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        fullName: `${person.firstName} ${person.lastName}`,
        email: person.email,
        phone: person.phone,
        jobTitle: person.jobTitle,
        avatarUrl: person.avatarUrl,
        bio: person.bio,
        role: person.role,
        memberSince: person.createdAt.toISOString(),
      },
      presence: presence
        ? {
            status: presence.status,
            statusMessage: presence.statusMessage ?? null,
            isManualOverride: presence.isManualOverride,
            manualOverrideExpiresAt: presence.manualOverrideExpiresAt?.toISOString() ?? null,
            lastSeenAt: presence.lastSeenAt.toISOString(),
          }
        : {
            status: "offline",
            statusMessage: null,
            isManualOverride: false,
            manualOverrideExpiresAt: null,
            lastSeenAt: null,
          },
      socialProfiles: socialRows.filter((s) => s.isPublic),
    })
  }
)

// ─── PATCH /api/people/[id] ───────────────────────────────────────────────────

const patchPersonSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(32).optional(),
  jobTitle: z.string().max(255).optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  storeId: z.string().uuid().nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  teamId: z.string().uuid().nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
  locale: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
  status: z.enum(["active", "inactive", "onboarding", "offboarded", "suspended"]).optional(),
})

export const PATCH = withGates(
  { action: "people.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const companyId = ctx.session.companyId

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, id), eq(users.companyId, companyId), isNull(users.deletedAt)))
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Person not found" }, { status: 404 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchPersonSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    // A user cannot be their own manager (self-referential FK managerId) — it
    // would create a 1-cycle that breaks org-chart / manager-chain traversal.
    if (parsed.data.managerId === id)
      return NextResponse.json(
        { error: "A person cannot be their own manager", code: "SELF_MANAGER" },
        { status: 409 }
      )

    const [updated] = await db
      .update(users)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(users.id, id), eq(users.companyId, companyId), isNull(users.deletedAt)))
      .returning({ id: users.id })

    void writeAuditLog({
      companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "people.update",
      entityType: "user",
      entityId: id,
      payload: parsed.data,
      method: "PATCH",
      path: `/api/people/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

// ─── DELETE /api/people/[id] ──────────────────────────────────────────────────
// Soft-delete: sets isActive=false, deletedAt=now, status="terminated".

export const DELETE = withGates(
  { action: "people.deactivate", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const companyId = ctx.session.companyId

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, id), eq(users.companyId, companyId), isNull(users.deletedAt)))
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Person not found" }, { status: 404 })

    await db
      .update(users)
      .set({
        isActive: false,
        deletedAt: new Date(),
        status: "offboarded" as const,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, id), eq(users.companyId, companyId), isNull(users.deletedAt)))

    void writeAuditLog({
      companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "people.deactivate",
      entityType: "user",
      entityId: id,
      payload: {},
      method: "DELETE",
      path: `/api/people/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
