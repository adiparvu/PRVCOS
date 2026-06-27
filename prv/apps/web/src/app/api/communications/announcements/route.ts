import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and, desc, isNull, lte, or } from "drizzle-orm"
import { db } from "@prv/db"
import { announcements, announcementReads, users } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const createSchema = z.object({
  title: z.string().min(1).max(300),
  body: z.string().min(1),
  audience: z.enum(["all", "managers", "employees", "department", "team"]).default("all"),
  audienceTargetId: z.string().uuid().optional(),
  isPinned: z.boolean().default(false),
  sendEmail: z.boolean().default(false),
  publishedAt: z.string().datetime().optional(),
  scheduledAt: z.string().datetime().optional(),
})

// GET /api/communications/announcements
export const GET = withGates(
  { action: "communications.announcements.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = req.nextUrl
    const pinned = searchParams.get("pinned")
    const now = new Date()

    const conditions = [
      eq(announcements.companyId, ctx.session.companyId),
      isNull(announcements.deletedAt),
      or(isNull(announcements.scheduledAt), lte(announcements.scheduledAt, now)) as ReturnType<
        typeof eq
      >,
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

    // Attach read status for current user
    const announcementIds = rows.map((r) => r.id)
    const readRows =
      announcementIds.length > 0
        ? await db
            .select({ announcementId: announcementReads.announcementId })
            .from(announcementReads)
            .where(
              and(
                eq(announcementReads.userId, ctx.session.userId),
                eq(announcementReads.companyId, ctx.session.companyId)
              )
            )
        : []

    const readSet = new Set(readRows.map((r) => r.announcementId))

    const items = rows.map((r) => ({ ...r, isRead: readSet.has(r.id) }))

    return NextResponse.json({ announcements: items })
  }
)

// POST /api/communications/announcements
export const POST = withGates(
  { action: "communications.announcements.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const {
      title,
      body: bodyText,
      audience,
      audienceTargetId,
      isPinned,
      sendEmail,
      publishedAt,
      scheduledAt,
    } = parsed.data

    const [announcement] = await db
      .insert(announcements)
      .values({
        companyId: ctx.session.companyId,
        authorUserId: ctx.session.userId,
        title,
        body: bodyText,
        audience,
        audienceTargetId,
        isPinned,
        sendEmail,
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      })
      .returning()

    if (!announcement) {
      return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 })
    }

    await writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      action: "communications.announcement.created",
      entityType: "announcement",
      entityId: announcement.id,
      payload: { title, audience },
    })

    return NextResponse.json({ announcement }, { status: 201 })
  }
)
