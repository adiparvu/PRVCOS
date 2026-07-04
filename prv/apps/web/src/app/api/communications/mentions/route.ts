import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { channelMessages, chatChannels, users } from "@prv/db/schema"
import { and, arrayContains, desc, eq, isNull } from "drizzle-orm"
import { summarizeMentions, type MentionSummary } from "@/lib/mentions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface MentionItem {
  id: string
  channelId: string
  channelName: string | null
  authorName: string | null
  snippet: string
  createdAt: string
}

export interface MentionsResponse {
  mentions: MentionItem[]
  meta: MentionSummary
}

function snippet(text: string, max = 160): string {
  const t = text.replace(/\s+/g, " ").trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

// GET /api/communications/mentions — every channel message that @-mentions the
// current user, newest first, scoped to their company.
export const GET = withGates(
  { action: "communications.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session

    const rows = await db
      .select({
        id: channelMessages.id,
        channelId: channelMessages.channelId,
        channelName: chatChannels.name,
        content: channelMessages.content,
        authorFirst: users.firstName,
        authorLast: users.lastName,
        createdAt: channelMessages.createdAt,
      })
      .from(channelMessages)
      .leftJoin(chatChannels, eq(channelMessages.channelId, chatChannels.id))
      .leftJoin(users, eq(channelMessages.userId, users.id))
      .where(
        and(
          eq(channelMessages.companyId, companyId),
          arrayContains(channelMessages.mentionedUserIds, [userId]),
          isNull(channelMessages.deletedAt)
        )
      )
      .orderBy(desc(channelMessages.createdAt))
      .limit(100)

    const mentions: MentionItem[] = rows.map((r) => ({
      id: r.id,
      channelId: r.channelId,
      channelName: r.channelName,
      authorName: r.authorFirst ? `${r.authorFirst} ${r.authorLast ?? ""}`.trim() : null,
      snippet: snippet(r.content),
      createdAt: r.createdAt.toISOString(),
    }))

    const meta = summarizeMentions(mentions, Date.now())
    return NextResponse.json({ mentions, meta })
  }
)
