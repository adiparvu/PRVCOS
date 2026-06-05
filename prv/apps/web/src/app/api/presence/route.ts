import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and, gt } from "drizzle-orm"
import { db } from "@prv/db"
import { userPresence } from "@prv/db/schema"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Presence considered stale after 90 seconds
const PRESENCE_TTL_SECONDS = 90

const upsertSchema = z.object({
  status: z.enum(["online", "away", "busy", "offline"]).default("online"),
  platform: z.enum(["web", "mobile", "desktop"]).default("web"),
  activeRoute: z.string().max(500).optional(),
  activeEntityType: z.string().max(100).optional(),
  activeEntityId: z.string().uuid().optional(),
})

// GET /api/presence — return online members in the caller's company
export const GET = withGates(
  { action: "presence.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const cutoff = new Date(Date.now() - PRESENCE_TTL_SECONDS * 1000)

    const rows = await db
      .select({
        userId: userPresence.userId,
        status: userPresence.status,
        platform: userPresence.platform,
        activeRoute: userPresence.activeRoute,
        activeEntityType: userPresence.activeEntityType,
        activeEntityId: userPresence.activeEntityId,
        lastSeenAt: userPresence.lastSeenAt,
      })
      .from(userPresence)
      .where(
        and(eq(userPresence.companyId, ctx.session.companyId), gt(userPresence.lastSeenAt, cutoff))
      )

    return NextResponse.json({ members: rows })
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
        },
      })

    return NextResponse.json({ ok: true })
  }
)
