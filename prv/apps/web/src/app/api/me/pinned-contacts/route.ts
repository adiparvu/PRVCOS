import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and, inArray } from "drizzle-orm"
import { db } from "@prv/db"
import { users, userPresence } from "@prv/db/schema"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAX_PINNED = 6

const updateSchema = z.object({
  contactIds: z.array(z.string().uuid()).max(MAX_PINNED),
})

// GET /api/me/pinned-contacts — return pinned contact records with presence
export const GET = withGates(
  { action: "presence.view_team", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    // Pinned contact IDs are stored in users.settings.dashboardPinnedContacts
    const [self] = await db
      .select({ settings: users.settings })
      .from(users)
      .where(eq(users.id, ctx.session.userId))
      .limit(1)

    const pinnedIds: string[] =
      ((self?.settings as Record<string, unknown>)?.dashboardPinnedContacts as string[]) ?? []

    if (pinnedIds.length === 0) return NextResponse.json({ contacts: [] })

    const rows = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
        jobTitle: users.jobTitle,
        presenceStatus: userPresence.status,
      })
      .from(users)
      .leftJoin(userPresence, eq(users.id, userPresence.userId))
      .where(and(eq(users.companyId, ctx.session.companyId), inArray(users.id, pinnedIds)))

    // Preserve pin order
    const ordered = pinnedIds
      .map((id) => rows.find((r) => r.id === id))
      .filter(Boolean)
      .map((r) => ({
        id: r!.id,
        firstName: r!.firstName,
        lastName: r!.lastName,
        avatarUrl: r!.avatarUrl ?? null,
        jobTitle: r!.jobTitle ?? null,
        presence: { status: r!.presenceStatus ?? "offline" },
      }))

    return NextResponse.json({ contacts: ordered })
  }
)

// PUT /api/me/pinned-contacts — replace pinned list
export const PUT = withGates(
  { action: "user.preferences.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [self] = await db
      .select({ settings: users.settings })
      .from(users)
      .where(eq(users.id, ctx.session.userId))
      .limit(1)

    const currentSettings = (self?.settings as Record<string, unknown>) ?? {}

    await db
      .update(users)
      .set({
        settings: { ...currentSettings, dashboardPinnedContacts: parsed.data.contactIds },
        updatedAt: new Date(),
      })
      .where(eq(users.id, ctx.session.userId))

    return NextResponse.json({ ok: true })
  }
)
