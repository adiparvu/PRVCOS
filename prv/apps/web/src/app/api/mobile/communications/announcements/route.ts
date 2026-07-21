import { NextRequest, NextResponse } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { z } from "zod"
import { writeAuditLog } from "@prv/auth"
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

const announcementSchema = z.object({
  title: z.string().min(1).max(300),
  body: z.string().min(1),
  audience: z.enum(["all", "managers", "employees", "department", "team"]).default("all"),
  audienceTargetId: z.string().uuid().optional(),
  isPinned: z.boolean().optional(),
  sendEmail: z.boolean().optional(),
  publishedAt: z.string().datetime().optional(),
  scheduledAt: z.string().datetime().optional(),
})

export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  const { companyId, userId } = ctx
  const parsed = announcementSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }
  const data = parsed.data

  const [announcement] = await db
    .insert(announcements)
    .values({
      companyId,
      authorUserId: userId,
      title: data.title.trim(),
      body: data.body.trim(),
      audience: data.audience,
      audienceTargetId: data.audienceTargetId,
      isPinned: data.isPinned ?? false,
      sendEmail: data.sendEmail ?? false,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : new Date(),
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
    })
    .returning()

  if (announcement)
    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.sessionId,
      action: "communications.announcement.created",
      entityType: "announcement",
      entityId: announcement.id,
      method: "POST",
      path: "/api/mobile/communications/announcements",
      ipAddress:
        req.headers.get("x-real-ip") ??
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        "unknown",
      userAgent: req.headers.get("user-agent") ?? "",
    })

  return NextResponse.json({ announcement }, { status: 201 })
})
