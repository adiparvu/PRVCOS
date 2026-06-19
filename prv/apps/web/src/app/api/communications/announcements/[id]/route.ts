import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and, isNull } from "drizzle-orm"
import { db } from "@prv/db"
import { announcements, announcementReads, users } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const patchSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  body: z.string().min(1).optional(),
  audience: z.enum(["all", "managers", "employees", "department", "team"]).optional(),
  audienceTargetId: z.string().uuid().nullable().optional(),
  isPinned: z.boolean().optional(),
  sendEmail: z.boolean().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
})

// GET /api/communications/announcements/[id]
export const GET = withGates(
  { action: "communications.announcements.read", endpointClass: "api_read" },
  async (
    _req: NextRequest,
    ctx: GateContext,
    { params }: { params: { id: string } }
  ): Promise<NextResponse> => {
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
          eq(announcements.id, params.id),
          eq(announcements.companyId, ctx.session.companyId),
          isNull(announcements.deletedAt)
        )
      )
      .limit(1)

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const [readRow] = await db
      .select({ readAt: announcementReads.readAt })
      .from(announcementReads)
      .where(
        and(
          eq(announcementReads.announcementId, params.id),
          eq(announcementReads.userId, ctx.session.userId)
        )
      )
      .limit(1)

    return NextResponse.json({
      announcement: { ...row, isRead: !!readRow, readAt: readRow?.readAt ?? null },
    })
  }
)

// PATCH /api/communications/announcements/[id]
export const PATCH = withGates(
  { action: "communications.announcements.update", endpointClass: "api_write" },
  async (
    req: NextRequest,
    ctx: GateContext,
    { params }: { params: { id: string } }
  ): Promise<NextResponse> => {
    const [existing] = await db
      .select({ id: announcements.id, authorUserId: announcements.authorUserId })
      .from(announcements)
      .where(
        and(
          eq(announcements.id, params.id),
          eq(announcements.companyId, ctx.session.companyId),
          isNull(announcements.deletedAt)
        )
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() }

    if (parsed.data.title !== undefined) updates.title = parsed.data.title
    if (parsed.data.body !== undefined) updates.body = parsed.data.body
    if (parsed.data.audience !== undefined) updates.audience = parsed.data.audience
    if (parsed.data.audienceTargetId !== undefined)
      updates.audienceTargetId = parsed.data.audienceTargetId
    if (parsed.data.isPinned !== undefined) updates.isPinned = parsed.data.isPinned
    if (parsed.data.sendEmail !== undefined) updates.sendEmail = parsed.data.sendEmail
    if (parsed.data.publishedAt !== undefined)
      updates.publishedAt = parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : null
    if (parsed.data.scheduledAt !== undefined)
      updates.scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null

    const [updated] = await db
      .update(announcements)
      .set(updates as Parameters<typeof db.update>[0])
      .where(eq(announcements.id, params.id))
      .returning()

    await writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      action: "communications.announcement.updated",
      resourceType: "announcement",
      resourceId: params.id,
      metadata: { changes: Object.keys(parsed.data) },
    })

    return NextResponse.json({ announcement: updated })
  }
)

// DELETE /api/communications/announcements/[id]
export const DELETE = withGates(
  { action: "communications.announcements.delete", endpointClass: "api_write" },
  async (
    _req: NextRequest,
    ctx: GateContext,
    { params }: { params: { id: string } }
  ): Promise<NextResponse> => {
    const [existing] = await db
      .select({ id: announcements.id })
      .from(announcements)
      .where(
        and(
          eq(announcements.id, params.id),
          eq(announcements.companyId, ctx.session.companyId),
          isNull(announcements.deletedAt)
        )
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db
      .update(announcements)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(announcements.id, params.id))

    await writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      action: "communications.announcement.deleted",
      resourceType: "announcement",
      resourceId: params.id,
      metadata: {},
    })

    return new NextResponse(null, { status: 204 })
  }
)
