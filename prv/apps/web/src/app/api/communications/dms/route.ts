import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and, desc, sql } from "drizzle-orm"
import { db } from "@prv/db"
import { directConversations, dmParticipants, dmMessages, users } from "@prv/db/schema"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const createSchema = z.object({
  participantIds: z.array(z.string().uuid()).min(1).max(19),
})

// GET /api/communications/dms — list conversations for current user
export const GET = withGates(
  { action: "communications.dms.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select({
        id: directConversations.id,
        lastMessageAt: directConversations.lastMessageAt,
        lastMessagePreview: directConversations.lastMessagePreview,
        createdAt: directConversations.createdAt,
      })
      .from(directConversations)
      .innerJoin(
        dmParticipants,
        and(
          eq(dmParticipants.conversationId, directConversations.id),
          eq(dmParticipants.userId, ctx.session.userId)
        )
      )
      .where(eq(directConversations.companyId, ctx.session.companyId))
      .orderBy(desc(directConversations.lastMessageAt))
      .limit(50)

    // Fetch participants for each conversation
    const convIds = rows.map((r) => r.id)
    const participantRows =
      convIds.length > 0
        ? await db
            .select({
              conversationId: dmParticipants.conversationId,
              userId: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              avatarUrl: users.avatarUrl,
              jobTitle: users.jobTitle,
            })
            .from(dmParticipants)
            .innerJoin(users, eq(dmParticipants.userId, users.id))
            .where(
              sql`${dmParticipants.conversationId} = ANY(${sql.raw(`ARRAY[${convIds.map((id) => `'${id}'`).join(",")}]::uuid[]`)})`
            )
        : []

    const participantsByConv = participantRows.reduce<Record<string, typeof participantRows>>(
      (acc, p) => {
        const list = acc[p.conversationId] ?? (acc[p.conversationId] = [])
        list.push(p)
        return acc
      },
      {}
    )

    const conversations = rows.map((r) => ({
      ...r,
      participants: participantsByConv[r.id] ?? [],
    }))

    return NextResponse.json({ conversations })
  }
)

// POST /api/communications/dms — start or find a DM conversation
export const POST = withGates(
  { action: "communications.dms.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const allParticipantIds = [
      ctx.session.userId,
      ...parsed.data.participantIds.filter((id) => id !== ctx.session.userId),
    ]

    // For 1:1 DMs, find existing conversation
    if (allParticipantIds.length === 2) {
      const otherId = allParticipantIds.find((id) => id !== ctx.session.userId)!
      const existing = await db
        .select({ id: directConversations.id })
        .from(directConversations)
        .innerJoin(dmParticipants, eq(dmParticipants.conversationId, directConversations.id))
        .where(
          and(
            eq(directConversations.companyId, ctx.session.companyId),
            eq(dmParticipants.userId, otherId)
          )
        )
        .limit(1)

      if (existing.length > 0) {
        return NextResponse.json({ conversation: existing[0], existing: true })
      }
    }

    const [conversation] = await db
      .insert(directConversations)
      .values({ companyId: ctx.session.companyId })
      .returning()

    if (!conversation) {
      return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 })
    }

    await db.insert(dmParticipants).values(
      allParticipantIds.map((userId) => ({
        conversationId: conversation.id,
        userId,
        companyId: ctx.session.companyId,
      }))
    )

    return NextResponse.json({ conversation, existing: false }, { status: 201 })
  }
)
