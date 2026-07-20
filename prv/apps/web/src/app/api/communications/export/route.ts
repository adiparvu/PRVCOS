import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog, RoleSets } from "@prv/auth"
import { db } from "@prv/db"
import { chatChannels, channelMessages, announcements, users } from "@prv/db/schema"
import { and, asc, eq, gte, lte, isNull } from "drizzle-orm"
import { exportDateBounds, summarizeExport } from "@/lib/communication-export"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Hard cap on exported channel messages per request. A larger legal export
// should be run as several bounded date ranges; the response flags truncation.
const MESSAGE_CAP = 10000
const ANNOUNCEMENT_CAP = 2000

// GET /api/communications/export?from=&to= — admin-only, company-isolated export
// of channel messages + announcements for a date range, as structured JSON for
// legal/compliance requests (roadmap 13.6). Private DMs are intentionally NOT
// included — bulk export of 1:1 messages is privacy-sensitive and awaits an
// explicit policy decision.
export const GET = withGates(
  {
    action: "communications.export",
    endpointClass: "api_read",
    requiredRoles: RoleSets.admin,
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId, sessionId } = ctx.session
    const { searchParams } = req.nextUrl

    const bounds = exportDateBounds(searchParams.get("from"), searchParams.get("to"), new Date())
    const from = new Date(bounds.fromMs)
    const to = new Date(bounds.toMs)

    // Channels (metadata) for this company.
    const channelRows = await db
      .select({ id: chatChannels.id, name: chatChannels.name, type: chatChannels.type })
      .from(chatChannels)
      .where(eq(chatChannels.companyId, companyId))
      .orderBy(asc(chatChannels.name))

    // Channel messages in range — one bounded query, grouped in memory.
    const msgRows = await db
      .select({
        id: channelMessages.id,
        channelId: channelMessages.channelId,
        authorId: channelMessages.userId,
        authorFirstName: users.firstName,
        authorLastName: users.lastName,
        content: channelMessages.content,
        type: channelMessages.type,
        createdAt: channelMessages.createdAt,
        editedAt: channelMessages.editedAt,
        deletedAt: channelMessages.deletedAt,
      })
      .from(channelMessages)
      .leftJoin(users, eq(channelMessages.userId, users.id))
      .where(
        and(
          eq(channelMessages.companyId, companyId),
          gte(channelMessages.createdAt, from),
          lte(channelMessages.createdAt, to)
        )
      )
      .orderBy(asc(channelMessages.createdAt))
      .limit(MESSAGE_CAP + 1)

    const truncated = msgRows.length > MESSAGE_CAP
    const messages = truncated ? msgRows.slice(0, MESSAGE_CAP) : msgRows

    const byChannel = new Map<string, typeof messages>()
    for (const m of messages) {
      const list = byChannel.get(m.channelId) ?? []
      list.push(m)
      byChannel.set(m.channelId, list)
    }

    const channels = channelRows.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      messages: (byChannel.get(c.id) ?? []).map((m) => ({
        id: m.id,
        authorId: m.authorId,
        authorName:
          m.authorFirstName || m.authorLastName
            ? `${m.authorFirstName ?? ""} ${m.authorLastName ?? ""}`.trim()
            : null,
        content: m.content,
        type: m.type,
        createdAt: m.createdAt.toISOString(),
        editedAt: m.editedAt?.toISOString() ?? null,
        deletedAt: m.deletedAt?.toISOString() ?? null,
      })),
    }))

    // Announcements in range.
    const annRows = await db
      .select({
        id: announcements.id,
        title: announcements.title,
        body: announcements.body,
        audience: announcements.audience,
        priority: announcements.priority,
        authorFirstName: users.firstName,
        authorLastName: users.lastName,
        publishedAt: announcements.publishedAt,
        createdAt: announcements.createdAt,
      })
      .from(announcements)
      .leftJoin(users, eq(announcements.authorUserId, users.id))
      .where(
        and(
          eq(announcements.companyId, companyId),
          isNull(announcements.deletedAt),
          gte(announcements.createdAt, from),
          lte(announcements.createdAt, to)
        )
      )
      .orderBy(asc(announcements.createdAt))
      .limit(ANNOUNCEMENT_CAP)

    const exportedAnnouncements = annRows.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      audience: a.audience,
      priority: a.priority,
      authorName:
        a.authorFirstName || a.authorLastName
          ? `${a.authorFirstName ?? ""} ${a.authorLastName ?? ""}`.trim()
          : null,
      publishedAt: a.publishedAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
    }))

    const summary = summarizeExport(
      channels.length,
      messages.length,
      exportedAnnouncements.length,
      truncated
    )

    // Exporting company communications is a compliance-sensitive read — log it.
    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "communications.export",
      entityType: "company",
      entityId: companyId,
      payload: { from: from.toISOString(), to: to.toISOString(), ...summary },
      method: "GET",
      path: "/api/communications/export",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      range: { from: from.toISOString(), to: to.toISOString(), defaulted: bounds.defaulted },
      includesDirectMessages: false,
      summary,
      channels,
      announcements: exportedAnnouncements,
    })
  }
)
