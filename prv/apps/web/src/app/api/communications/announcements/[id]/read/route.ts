import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and, isNull, sql } from "drizzle-orm"
import { db } from "@prv/db"
import { announcements, announcementReads } from "@prv/db/schema"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// POST /api/communications/announcements/[id]/read
export const POST = withGates(
  { action: "communications.announcements.read", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    // path: .../announcements/[id]/read — id is second-to-last segment
    const id = req.nextUrl.pathname.split("/").at(-2) ?? ""

    const [announcement] = await db
      .select({ id: announcements.id, totalAudience: announcements.totalAudience })
      .from(announcements)
      .where(
        and(
          eq(announcements.id, id),
          eq(announcements.companyId, ctx.session.companyId),
          isNull(announcements.deletedAt)
        )
      )
      .limit(1)

    if (!announcement) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Upsert read record (idempotent)
    await db
      .insert(announcementReads)
      .values({
        announcementId: id,
        userId: ctx.session.userId,
        companyId: ctx.session.companyId,
      })
      .onConflictDoNothing()

    // Increment read count (only if this is a first read — approximate via trigger-less approach)
    await db
      .update(announcements)
      .set({ readCount: sql`${announcements.readCount} + 1` })
      .where(
        and(
          eq(announcements.id, id),
          // Only increment when we just inserted (not on conflict)
          sql`NOT EXISTS (
            SELECT 1 FROM announcement_reads
            WHERE announcement_id = ${id}
              AND user_id = ${ctx.session.userId}
              AND read_at < NOW() - INTERVAL '1 second'
          )` as ReturnType<typeof eq>
        )
      )

    return NextResponse.json({ ok: true })
  }
)
