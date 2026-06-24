import { NextRequest, NextResponse } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { chatChannels, channelMembers, channelMessages, users } from "@prv/db/schema"
import { and, desc, eq, isNull, lt } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const PAGE_SIZE = 50

async function assertMember(channelId: string, userId: string, companyId: string) {
  const [row] = await db
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
  return !!row
}

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const { companyId, userId } = ctx
  const id = req.nextUrl.pathname.split("/").at(-2) ?? ""
  const sp = req.nextUrl.searchParams
  const cursor = sp.get("cursor")
  const parentId = sp.get("parentId")

  const [channel] = await db
    .select({ id: chatChannels.id, type: chatChannels.type })
    .from(chatChannels)
    .where(and(eq(chatChannels.id, id), eq(chatChannels.companyId, companyId)))
    .limit(1)

  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (channel.type === "private") {
    const ok = await assertMember(id, userId, companyId)
    if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const conditions: ReturnType<typeof eq>[] = [
    eq(channelMessages.channelId, id),
    eq(channelMessages.companyId, companyId),
    isNull(channelMessages.deletedAt),
    parentId
      ? (eq(channelMessages.parentId, parentId) as ReturnType<typeof eq>)
      : (isNull(channelMessages.parentId) as ReturnType<typeof eq>),
  ]

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
  const nextCursor = hasMore ? messages[messages.length - 1]!.createdAt?.toISOString() : null

  return NextResponse.json({ messages, hasMore, nextCursor })
})

export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  const { companyId, userId } = ctx
  const id = req.nextUrl.pathname.split("/").at(-2) ?? ""

  const [channel] = await db
    .select({ id: chatChannels.id })
    .from(chatChannels)
    .where(and(eq(chatChannels.id, id), eq(chatChannels.companyId, companyId)))
    .limit(1)

  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const ok = await assertMember(id, userId, companyId)
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = (await req.json().catch(() => ({}))) as {
    content?: string
    type?: "text" | "file" | "image" | "system"
    parentId?: string
    mentionedUserIds?: string[]
    metadata?: Record<string, unknown>
  }

  if (!body.content?.trim()) {
    return NextResponse.json({ error: "content is required" }, { status: 400 })
  }

  const [message] = await db
    .insert(channelMessages)
    .values({
      channelId: id,
      userId,
      companyId,
      content: body.content.trim(),
      type: body.type ?? "text",
      parentId: body.parentId,
      mentionedUserIds: body.mentionedUserIds ?? [],
      metadata: body.metadata ?? {},
    })
    .returning()

  await db
    .update(chatChannels)
    .set({
      lastMessageAt: message!.createdAt,
      lastMessagePreview: body.content.trim().slice(0, 200),
      updatedAt: new Date(),
    })
    .where(eq(chatChannels.id, id))

  return NextResponse.json({ message }, { status: 201 })
})
