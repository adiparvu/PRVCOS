import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db } from "@prv/db"
import { users, userPresence, socialProfiles } from "@prv/db/schema"
import type { GateContext } from "@prv/auth"

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
