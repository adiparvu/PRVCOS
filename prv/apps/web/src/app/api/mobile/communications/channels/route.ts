import { NextRequest, NextResponse } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { chatChannels, channelMembers } from "@prv/db/schema"
import { and, asc, desc, eq, ilike } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const sp = req.nextUrl.searchParams
  const type = sp.get("type") as "public" | "private" | "announcement" | null
  const search = sp.get("search")?.trim()
  const { companyId } = ctx

  const conditions: ReturnType<typeof eq>[] = [
    eq(chatChannels.companyId, companyId),
    eq(chatChannels.isArchived, false),
  ]

  if (type && ["public", "private", "announcement"].includes(type)) {
    conditions.push(eq(chatChannels.type, type))
  }

  if (search) {
    conditions.push(ilike(chatChannels.name, `%${search}%`) as ReturnType<typeof eq>)
  }

  const channels = await db
    .select({
      id: chatChannels.id,
      name: chatChannels.name,
      description: chatChannels.description,
      type: chatChannels.type,
      isArchived: chatChannels.isArchived,
      lastMessageAt: chatChannels.lastMessageAt,
      lastMessagePreview: chatChannels.lastMessagePreview,
      createdAt: chatChannels.createdAt,
    })
    .from(chatChannels)
    .where(and(...conditions))
    .orderBy(desc(chatChannels.lastMessageAt), asc(chatChannels.name))
    .limit(100)

  return NextResponse.json({ channels })
})

export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  const { companyId, userId } = ctx
  const body = (await req.json().catch(() => ({}))) as {
    name?: string
    description?: string
    type?: "public" | "private" | "announcement"
    memberIds?: string[]
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  const [channel] = await db
    .insert(chatChannels)
    .values({
      companyId,
      createdByUserId: userId,
      name: body.name.trim(),
      description: body.description,
      type: body.type ?? "public",
    })
    .returning()

  const memberIds = body.memberIds ?? []
  const memberInserts = [
    { channelId: channel!.id, userId, companyId, role: "admin" as const },
    ...memberIds
      .filter((id) => id !== userId)
      .map((id) => ({ channelId: channel!.id, userId: id, companyId, role: "member" as const })),
  ]

  await db.insert(channelMembers).values(memberInserts).onConflictDoNothing()

  return NextResponse.json({ channel }, { status: 201 })
})
