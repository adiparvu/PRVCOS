import { NextRequest, NextResponse } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { announcements, announcementReads } from "@prv/db/schema"
import { and, eq, isNull, sql } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  const { companyId, userId } = ctx
  const id = req.nextUrl.pathname.split("/").at(-2) ?? ""

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

  await db
    .insert(announcementReads)
    .values({ announcementId: id, userId, companyId })
    .onConflictDoNothing()

  await db
    .update(announcements)
    .set({ readCount: sql`${announcements.readCount} + 1` })
    .where(
      and(
        eq(announcements.id, id),
        sql`NOT EXISTS (
          SELECT 1 FROM announcement_reads
          WHERE announcement_id = ${id}
            AND user_id = ${userId}
            AND read_at < NOW() - INTERVAL '1 second'
        )` as ReturnType<typeof eq>
      )
    )

  return NextResponse.json({ ok: true })
})
