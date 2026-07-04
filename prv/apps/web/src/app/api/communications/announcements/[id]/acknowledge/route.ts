import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { announcements, announcementAcknowledgments } from "@prv/db/schema"
import { and, eq, isNull, sql } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// POST /api/communications/announcements/[id]/acknowledge — record the current
// user's explicit acknowledgment (idempotent), incrementing the ack count once.
export const POST = withGates(
  { action: "communications.announcements.read", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").at(-2) ?? ""
    const { companyId, userId } = ctx.session

    const [announcement] = await db
      .select({ id: announcements.id })
      .from(announcements)
      .where(
        and(
          eq(announcements.id, id),
          eq(announcements.companyId, companyId),
          isNull(announcements.deletedAt)
        )
      )
      .limit(1)
    if (!announcement) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const inserted = await db
      .insert(announcementAcknowledgments)
      .values({ announcementId: id, userId, companyId })
      .onConflictDoNothing()
      .returning({ id: announcementAcknowledgments.id })

    // Only bump the counter on a genuinely new acknowledgment.
    if (inserted.length > 0) {
      await db
        .update(announcements)
        .set({ ackCount: sql`${announcements.ackCount} + 1` })
        .where(and(eq(announcements.id, id), eq(announcements.companyId, companyId)))
    }

    return NextResponse.json({ ok: true, acknowledged: true })
  }
)
