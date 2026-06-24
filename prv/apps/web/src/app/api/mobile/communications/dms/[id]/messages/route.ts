import { NextRequest, NextResponse } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { directConversations, dmMessages, dmParticipants, users } from "@prv/db/schema"
import { and, desc, eq, isNull, lt } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const PAGE_SIZE = 50

async function assertParticipant(conversationId: string, userId: string, companyId: string) {
  const [row] = await db
    .select({ id: dmParticipants.id })
    .from(dmParticipants)
    .where(
      and(
        eq(dmParticipants.conversationId, conversationId),
        eq(dmParticipants.userId, userId),
        eq(dmParticipants.companyId, companyId)
      )
    )
    .limit(1)
  return !!row
}

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const { companyId, userId } = ctx
  const id = req.nextUrl.pathname.split("/").at(-2) ?? ""
  const cursor = req.nextUrl.searchParams.get("cursor")

  const [conv] = await db
    .select({ id: directConversations.id })
    .from(directConversations)
    .where(and(eq(directConversations.id, id), eq(directConversations.companyId, companyId)))
    .limit(1)

  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const ok = await assertParticipant(id, userId, companyId)
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const conditions: ReturnType<typeof eq>[] = [
    eq(dmMessages.conversationId, id),
    eq(dmMessages.companyId, companyId),
    isNull(dmMessages.deletedAt),
  ]

  if (cursor) {
    conditions.push(lt(dmMessages.createdAt, new Date(cursor)) as ReturnType<typeof eq>)
  }

  const rows = await db
    .select({
      id: dmMessages.id,
      content: dmMessages.content,
      type: dmMessages.type,
      metadata: dmMessages.metadata,
      editedAt: dmMessages.editedAt,
      createdAt: dmMessages.createdAt,
      authorId: users.id,
      authorFirstName: users.firstName,
      authorLastName: users.lastName,
      authorAvatarUrl: users.avatarUrl,
      authorJobTitle: users.jobTitle,
    })
    .from(dmMessages)
    .leftJoin(users, eq(dmMessages.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(dmMessages.createdAt))
    .limit(PAGE_SIZE + 1)

  const hasMore = rows.length > PAGE_SIZE
  const messages = rows.slice(0, PAGE_SIZE)
  const nextCursor = hasMore ? messages[messages.length - 1]!.createdAt?.toISOString() : null

  // Mark as read
  await db
    .update(dmParticipants)
    .set({ lastReadAt: new Date() })
    .where(and(eq(dmParticipants.conversationId, id), eq(dmParticipants.userId, userId)))

  return NextResponse.json({ messages, hasMore, nextCursor })
})

export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  const { companyId, userId } = ctx
  const id = req.nextUrl.pathname.split("/").at(-2) ?? ""

  const [conv] = await db
    .select({ id: directConversations.id })
    .from(directConversations)
    .where(and(eq(directConversations.id, id), eq(directConversations.companyId, companyId)))
    .limit(1)

  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const ok = await assertParticipant(id, userId, companyId)
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = (await req.json().catch(() => ({}))) as {
    content?: string
    type?: "text" | "file" | "image" | "system"
    metadata?: Record<string, unknown>
  }

  if (!body.content?.trim()) {
    return NextResponse.json({ error: "content is required" }, { status: 400 })
  }

  const [message] = await db
    .insert(dmMessages)
    .values({
      conversationId: id,
      userId,
      companyId,
      content: body.content.trim(),
      type: body.type ?? "text",
      metadata: body.metadata ?? {},
    })
    .returning()

  await db
    .update(directConversations)
    .set({
      lastMessageAt: message!.createdAt,
      lastMessagePreview: body.content.trim().slice(0, 200),
    })
    .where(eq(directConversations.id, id))

  return NextResponse.json({ message }, { status: 201 })
})
