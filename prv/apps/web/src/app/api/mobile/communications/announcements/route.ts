import { NextRequest, NextResponse } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { announcements, announcementReads, users } from "@prv/db/schema"
import { and, desc, eq, isNull, lte, gt, or } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const { companyId, userId } = ctx
  const pinned = req.nextUrl.searchParams.get("pinned")
  const now = new Date()

  const conditions: ReturnType<typeof eq>[] = [
    eq(announcements.companyId, companyId),
    isNull(announcements.deletedAt),
    // Active feed only: hide archived + expired (see lib/announcement-visibility).
    isNull(announcements.archivedAt),
    or(isNull(announcements.scheduledAt), lte(announcements.scheduledAt, now)) as ReturnType<
      typeof eq
    >,
    or(isNull(announcements.expiresAt), gt(announcements.expiresAt, now)) as ReturnType<typeof eq>,
  ]

  if (pinned === "true") {
    conditions.push(eq(announcements.isPinned, true))
  }

  const rows = await db
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
    .where(and(...conditions))
    .orderBy(
      desc(announcements.isPinned),
      desc(announcements.publishedAt),
      desc(announcements.createdAt)
    )
    .limit(50)

  const announcementIds = rows.map((r) => r.id)
  const readRows =
    announcementIds.length > 0
      ? await db
          .select({ announcementId: announcementReads.announcementId })
          .from(announcementReads)
          .where(
            and(eq(announcementReads.userId, userId), eq(announcementReads.companyId, companyId))
          )
      : []

  const readSet = new Set(readRows.map((r) => r.announcementId))
  const items = rows.map((r) => ({ ...r, isRead: readSet.has(r.id) }))

  return NextResponse.json({ announcements: items })
})

export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  const { companyId, userId } = ctx
  const body = (await req.json().catch(() => ({}))) as {
    title?: string
    body?: string
    audience?: "all" | "managers" | "employees" | "department" | "team"
    audienceTargetId?: string
    isPinned?: boolean
    sendEmail?: boolean
    publishedAt?: string
    scheduledAt?: string
  }

  if (!body.title?.trim() || !body.body?.trim()) {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 })
  }

  const [announcement] = await db
    .insert(announcements)
    .values({
      companyId,
      authorUserId: userId,
      title: body.title.trim(),
      body: body.body.trim(),
      audience: body.audience ?? "all",
      audienceTargetId: body.audienceTargetId,
      isPinned: body.isPinned ?? false,
      sendEmail: body.sendEmail ?? false,
      publishedAt: body.publishedAt ? new Date(body.publishedAt) : new Date(),
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    })
    .returning()

  return NextResponse.json({ announcement }, { status: 201 })
})
