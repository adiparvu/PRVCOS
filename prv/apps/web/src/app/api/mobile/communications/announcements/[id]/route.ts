import { NextRequest, NextResponse } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { announcements, announcementReads, users } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const { companyId, userId } = ctx
  const id = req.nextUrl.pathname.split("/").pop() ?? ""

  const [row] = await db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      audience: announcements.audience,
      audienceTargetId: announcements.audienceTargetId,
      isPinned: announcements.isPinned,
      sendEmail: announcements.sendEmail,
      publishedAt: announcements.publishedAt,
      scheduledAt: announcements.scheduledAt,
      readCount: announcements.readCount,
      totalAudience: announcements.totalAudience,
      createdAt: announcements.createdAt,
      updatedAt: announcements.updatedAt,
      authorId: users.id,
      authorFirstName: users.firstName,
      authorLastName: users.lastName,
      authorAvatarUrl: users.avatarUrl,
    })
    .from(announcements)
    .leftJoin(users, eq(announcements.authorUserId, users.id))
    .where(
      and(
        eq(announcements.id, id),
        eq(announcements.companyId, companyId),
        isNull(announcements.deletedAt)
      )
    )
    .limit(1)

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const [readRow] = await db
    .select({ readAt: announcementReads.readAt })
    .from(announcementReads)
    .where(and(eq(announcementReads.announcementId, id), eq(announcementReads.userId, userId)))
    .limit(1)

  return NextResponse.json({
    announcement: { ...row, isRead: !!readRow, readAt: readRow?.readAt ?? null },
  })
})

export const PATCH = withMobileAuth(async (req: NextRequest, ctx) => {
  const { companyId } = ctx
  const id = req.nextUrl.pathname.split("/").pop() ?? ""

  const [existing] = await db
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

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = (await req.json().catch(() => ({}))) as {
    title?: string
    body?: string
    audience?: "all" | "managers" | "employees" | "department" | "team"
    audienceTargetId?: string | null
    isPinned?: boolean
    sendEmail?: boolean
    publishedAt?: string | null
    scheduledAt?: string | null
  }

  const updates: Partial<typeof announcements.$inferInsert> & { updatedAt: Date } = {
    updatedAt: new Date(),
  }
  if (body.title !== undefined) updates.title = body.title
  if (body.body !== undefined) updates.body = body.body
  if (body.audience !== undefined) updates.audience = body.audience
  if (body.audienceTargetId !== undefined) updates.audienceTargetId = body.audienceTargetId
  if (body.isPinned !== undefined) updates.isPinned = body.isPinned
  if (body.sendEmail !== undefined) updates.sendEmail = body.sendEmail
  if (body.publishedAt !== undefined)
    updates.publishedAt = body.publishedAt ? new Date(body.publishedAt) : null
  if (body.scheduledAt !== undefined)
    updates.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null

  const [updated] = await db
    .update(announcements)
    .set(updates)
    .where(eq(announcements.id, id))
    .returning()

  return NextResponse.json({ announcement: updated })
})

export const DELETE = withMobileAuth(async (req: NextRequest, ctx) => {
  const { companyId } = ctx
  const id = req.nextUrl.pathname.split("/").pop() ?? ""

  const [existing] = await db
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

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await db
    .update(announcements)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(announcements.id, id))

  return new NextResponse(null, { status: 204 })
})
