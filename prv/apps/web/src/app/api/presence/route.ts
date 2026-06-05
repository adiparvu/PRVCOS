import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and, gt, desc } from "drizzle-orm"
import { db } from "@prv/db"
import { userPresence } from "@prv/db/schema"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Presence considered stale after 90 seconds
const PRESENCE_TTL_SECONDS = 90
const MAX_PAGE_SIZE = 50

const upsertSchema = z.object({
  status: z
    .enum(["online", "away", "busy", "offline", "in_meeting", "on_break", "do_not_disturb"])
    .default("online"),
  platform: z.enum(["web", "mobile", "desktop"]).default("web"),
  activeRoute: z.string().max(500).optional(),
  activeEntityType: z.string().max(100).optional(),
  activeEntityId: z.string().uuid().optional(),
})

// GET /api/presence — paginated list of non-stale company members
// Query: ?limit=50&status=online (status filter optional)
export const GET = withGates(
  { action: "presence.view_team", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = req.nextUrl
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "50", 10) || MAX_PAGE_SIZE,
      MAX_PAGE_SIZE
    )
    const statusFilter = searchParams.get("status")
    const cutoff = new Date(Date.now() - PRESENCE_TTL_SECONDS * 1000)

    const rows = await db
      .select({
        userId: userPresence.userId,
        status: userPresence.status,
        statusMessage: userPresence.statusMessage,
        platform: userPresence.platform,
        activeRoute: userPresence.activeRoute,
        activeEntityType: userPresence.activeEntityType,
        activeEntityId: userPresence.activeEntityId,
        lastSeenAt: userPresence.lastSeenAt,
      })
      .from(userPresence)
      .where(
        and(
          eq(userPresence.companyId, ctx.session.companyId),
          gt(userPresence.lastSeenAt, cutoff),
          // Optional status filter
          statusFilter ? eq(userPresence.status, statusFilter as "online") : undefined
        )
      )
      .orderBy(desc(userPresence.lastSeenAt))
      .limit(limit)

    return NextResponse.json({ members: rows, count: rows.length })
  }
)

// POST /api/presence — upsert the authenticated user's presence heartbeat
export const POST = withGates(
  { action: "presence.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = upsertSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const now = new Date()
    await db
      .insert(userPresence)
      .values({
        userId: ctx.session.userId,
        companyId: ctx.session.companyId,
        status: parsed.data.status,
        platform: parsed.data.platform,
        activeRoute: parsed.data.activeRoute,
        activeEntityType: parsed.data.activeEntityType,
        activeEntityId: parsed.data.activeEntityId,
        lastSeenAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [userPresence.userId, userPresence.companyId],
        set: {
          status: parsed.data.status,
          platform: parsed.data.platform,
          activeRoute: parsed.data.activeRoute,
          activeEntityType: parsed.data.activeEntityType,
          activeEntityId: parsed.data.activeEntityId,
          lastSeenAt: now,
          updatedAt: now,
        },
      })

    return NextResponse.json({ ok: true })
  }
)
