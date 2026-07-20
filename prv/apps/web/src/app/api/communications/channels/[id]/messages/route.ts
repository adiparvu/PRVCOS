import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and, desc, lt, isNull } from "drizzle-orm"
import { db } from "@prv/db"
import { channelMessages, channelMembers, chatChannels, users } from "@prv/db/schema"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const PAGE_SIZE = 50

const postSchema = z.object({
  content: z.string().min(1).max(4000),
  type: z.enum(["text", "file", "image", "system"]).default("text"),
  parentId: z.string().uuid().optional(),
  mentionedUserIds: z.array(z.string().uuid()).optional(),
  metadata: z.record(z.unknown()).optional(),
})

async function assertMember(channelId: string, userId: string, companyId: string) {
  const [membership] = await db
    .select({ id: channelMembers.id })
    .from(channelMembers)
    .where(
      and(
        eq(channelMembers.channelId, channelId),
        eq(channelMembers.userId, userId),
        eq(channelMembers.companyId, companyId)
      )
    )
    .limit(1)
  return !!membership
}

// GET /api/communications/channels/[id]/messages
export const GET = withGates(
  { action: "communications.channels.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    // path: .../channels/[id]/messages — id is second-to-last segment
    const parts = req.nextUrl.pathname.split("/")
    const channelId = parts.at(-2) ?? ""
    const { searchParams } = req.nextUrl
    const cursor = searchParams.get("cursor")
    const parentId = searchParams.get("parentId")

    // Verify channel belongs to company
    const [channel] = await db
      .select({ id: chatChannels.id, type: chatChannels.type })
      .from(chatChannels)
      .where(and(eq(chatChannels.id, channelId), eq(chatChannels.companyId, ctx.session.companyId)))
      .limit(1)

    if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // For private channels, verify membership
    if (channel.type === "private") {
      const isMember = await assertMember(channelId, ctx.session.userId, ctx.session.companyId)
      if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Opening a channel marks it read for the caller — advances their lastReadAt
    // so the channels list unread badge clears (no-op if they are not a member).
    void db
      .update(channelMembers)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(channelMembers.channelId, channelId),
          eq(channelMembers.userId, ctx.session.userId),
          eq(channelMembers.companyId, ctx.session.companyId)
        )
      )

    const conditions = [
      eq(channelMessages.channelId, channelId),
      eq(channelMessages.companyId, ctx.session.companyId),
      isNull(channelMessages.deletedAt),
    ]

    if (parentId) {
      conditions.push(eq(channelMessages.parentId, parentId) as ReturnType<typeof eq>)
    } else {
      conditions.push(isNull(channelMessages.parentId) as ReturnType<typeof eq>)
    }

    if (cursor) {
      conditions.push(lt(channelMessages.createdAt, new Date(cursor)) as ReturnType<typeof eq>)
    }

    const rows = await db
      .select({
        id: channelMessages.id,
        content: channelMessages.content,
        type: channelMessages.type,
        parentId: channelMessages.parentId,
        threadCount: channelMessages.threadCount,
        reactions: channelMessages.reactions,
        metadata: channelMessages.metadata,
        mentionedUserIds: channelMessages.mentionedUserIds,
        editedAt: channelMessages.editedAt,
        createdAt: channelMessages.createdAt,
        authorId: users.id,
        authorFirstName: users.firstName,
        authorLastName: users.lastName,
        authorAvatarUrl: users.avatarUrl,
        authorJobTitle: users.jobTitle,
      })
      .from(channelMessages)
      .leftJoin(users, eq(channelMessages.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(channelMessages.createdAt))
      .limit(PAGE_SIZE + 1)

    const hasMore = rows.length > PAGE_SIZE
    const messages = rows.slice(0, PAGE_SIZE)
    const nextCursor = hasMore ? (messages.at(-1)?.createdAt?.toISOString() ?? null) : null

    return NextResponse.json({ messages, hasMore, nextCursor })
  }
)

// POST /api/communications/channels/[id]/messages
export const POST = withGates(
  { action: "communications.messages.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const channelId = req.nextUrl.pathname.split("/").at(-2) ?? ""

    const [channel] = await db
      .select({ id: chatChannels.id, type: chatChannels.type })
      .from(chatChannels)
      .where(and(eq(chatChannels.id, channelId), eq(chatChannels.companyId, ctx.session.companyId)))
      .limit(1)

    if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const isMember = await assertMember(channelId, ctx.session.userId, ctx.session.companyId)
    if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await req.json()
    const parsed = postSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { content, type, parentId, mentionedUserIds = [], metadata = {} } = parsed.data

    const [message] = await db
      .insert(channelMessages)
      .values({
        channelId,
        userId: ctx.session.userId,
        companyId: ctx.session.companyId,
        content,
        type,
        parentId,
        mentionedUserIds,
        metadata,
      })
      .returning()

    // Update channel last message denorm
    if (message) {
      await db
        .update(chatChannels)
        .set({
          lastMessageAt: message.createdAt,
          lastMessagePreview: content.slice(0, 200),
          updatedAt: new Date(),
        })
        .where(eq(chatChannels.id, channelId))
    }

    // Increment thread count if this is a reply
    if (parentId) {
      await db
        .update(channelMessages)
        .set({ threadCount: channelMessages.threadCount })
        .where(eq(channelMessages.id, parentId))
    }

    return NextResponse.json({ message }, { status: 201 })
  }
)
