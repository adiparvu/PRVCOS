import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and, desc, lt, isNull } from "drizzle-orm"
import { db } from "@prv/db"
import { dmMessages, dmParticipants, directConversations, users } from "@prv/db/schema"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const PAGE_SIZE = 50

const postSchema = z.object({
  content: z.string().min(1).max(4000),
  type: z.enum(["text", "file", "image", "system"]).default("text"),
  metadata: z.record(z.unknown()).optional(),
})

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

// GET /api/communications/dms/[id]/messages
export const GET = withGates(
  { action: "communications.dms.read", endpointClass: "api_read" },
  async (
    req: NextRequest,
    ctx: GateContext,
    { params }: { params: { id: string } }
  ): Promise<NextResponse> => {
    const conversationId = params.id
    const { searchParams } = req.nextUrl
    const cursor = searchParams.get("cursor")

    const [conv] = await db
      .select({ id: directConversations.id })
      .from(directConversations)
      .where(
        and(
          eq(directConversations.id, conversationId),
          eq(directConversations.companyId, ctx.session.companyId)
        )
      )
      .limit(1)

    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const isParticipant = await assertParticipant(
      conversationId,
      ctx.session.userId,
      ctx.session.companyId
    )
    if (!isParticipant) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const conditions = [
      eq(dmMessages.conversationId, conversationId),
      eq(dmMessages.companyId, ctx.session.companyId),
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
    const nextCursor = hasMore ? messages[messages.length - 1].createdAt?.toISOString() : null

    // Update last read timestamp
    await db
      .update(dmParticipants)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(dmParticipants.conversationId, conversationId),
          eq(dmParticipants.userId, ctx.session.userId)
        )
      )

    return NextResponse.json({ messages, hasMore, nextCursor })
  }
)

// POST /api/communications/dms/[id]/messages
export const POST = withGates(
  { action: "communications.dms.create", endpointClass: "api_write" },
  async (
    req: NextRequest,
    ctx: GateContext,
    { params }: { params: { id: string } }
  ): Promise<NextResponse> => {
    const conversationId = params.id

    const [conv] = await db
      .select({ id: directConversations.id })
      .from(directConversations)
      .where(
        and(
          eq(directConversations.id, conversationId),
          eq(directConversations.companyId, ctx.session.companyId)
        )
      )
      .limit(1)

    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const isParticipant = await assertParticipant(
      conversationId,
      ctx.session.userId,
      ctx.session.companyId
    )
    if (!isParticipant) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await req.json()
    const parsed = postSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { content, type, metadata = {} } = parsed.data

    const [message] = await db
      .insert(dmMessages)
      .values({
        conversationId,
        userId: ctx.session.userId,
        companyId: ctx.session.companyId,
        content,
        type,
        metadata,
      })
      .returning()

    await db
      .update(directConversations)
      .set({
        lastMessageAt: message.createdAt,
        lastMessagePreview: content.slice(0, 200),
      })
      .where(eq(directConversations.id, conversationId))

    return NextResponse.json({ message }, { status: 201 })
  }
)
