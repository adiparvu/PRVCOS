import { NextRequest, NextResponse } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { directConversations, dmParticipants, users } from "@prv/db/schema"
import { and, desc, eq, sql } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withMobileAuth(async (_req: NextRequest, ctx) => {
  const { companyId, userId } = ctx

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
        eq(dmParticipants.userId, userId)
      )
    )
    .where(eq(directConversations.companyId, companyId))
    .orderBy(desc(directConversations.lastMessageAt))
    .limit(50)

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
            sql`${dmParticipants.conversationId} = ANY(${sql.raw(
              `ARRAY[${convIds.map((id) => `'${id}'`).join(",")}]::uuid[]`
            )})`
          )
      : []

  const byConv = participantRows.reduce<Record<string, typeof participantRows>>((acc, p) => {
    if (!acc[p.conversationId]) acc[p.conversationId] = []
    acc[p.conversationId]!.push(p)
    return acc
  }, {})

  const conversations = rows.map((r) => ({ ...r, participants: byConv[r.id] ?? [] }))

  return NextResponse.json({ conversations })
})

export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  const { companyId, userId } = ctx
  const body = (await req.json().catch(() => ({}))) as { participantIds?: string[] }

  if (!body.participantIds?.length) {
    return NextResponse.json({ error: "participantIds is required" }, { status: 400 })
  }

  const allIds = [userId, ...body.participantIds.filter((id) => id !== userId)]

  if (allIds.length === 2) {
    const otherId = allIds.find((id) => id !== userId)!
    const existing = await db
      .select({ id: directConversations.id })
      .from(directConversations)
      .innerJoin(dmParticipants, eq(dmParticipants.conversationId, directConversations.id))
      .where(and(eq(directConversations.companyId, companyId), eq(dmParticipants.userId, otherId)))
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json({ conversation: existing[0], existing: true })
    }
  }

  const [conversation] = await db.insert(directConversations).values({ companyId }).returning()

  await db
    .insert(dmParticipants)
    .values(allIds.map((id) => ({ conversationId: conversation!.id, userId: id, companyId })))

  return NextResponse.json({ conversation, existing: false }, { status: 201 })
})
