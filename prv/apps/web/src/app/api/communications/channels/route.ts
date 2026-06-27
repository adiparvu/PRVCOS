import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and, desc, ilike, asc } from "drizzle-orm"
import { db } from "@prv/db"
import { chatChannels, channelMembers } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(["public", "private", "announcement"]).default("public"),
  memberIds: z.array(z.string().uuid()).optional(),
})

// GET /api/communications/channels
export const GET = withGates(
  { action: "communications.channels.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = req.nextUrl
    const search = searchParams.get("search")?.trim()
    const type = searchParams.get("type")

    const conditions: ReturnType<typeof eq>[] = [
      eq(chatChannels.companyId, ctx.session.companyId),
      eq(chatChannels.isArchived, false),
    ]

    if (type && ["public", "private", "announcement"].includes(type)) {
      conditions.push(eq(chatChannels.type, type as "public" | "private" | "announcement"))
    }

    if (search) {
      conditions.push(ilike(chatChannels.name, `%${search}%`) as ReturnType<typeof eq>)
    }

    const rows = await db
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

    return NextResponse.json({ channels: rows })
  }
)

// POST /api/communications/channels
export const POST = withGates(
  { action: "communications.channels.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { name, description, type, memberIds = [] } = parsed.data

    const [channel] = await db
      .insert(chatChannels)
      .values({
        companyId: ctx.session.companyId,
        createdByUserId: ctx.session.userId,
        name,
        description,
        type,
      })
      .returning()

    if (!channel) {
      return NextResponse.json({ error: "Failed to create channel" }, { status: 500 })
    }

    // Add creator as admin member
    const memberInserts = [
      {
        channelId: channel.id,
        userId: ctx.session.userId,
        companyId: ctx.session.companyId,
        role: "admin" as const,
      },
      ...memberIds
        .filter((id) => id !== ctx.session.userId)
        .map((id) => ({
          channelId: channel.id,
          userId: id,
          companyId: ctx.session.companyId,
          role: "member" as const,
        })),
    ]

    await db.insert(channelMembers).values(memberInserts).onConflictDoNothing()

    await writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      action: "communications.channel.created",
      entityType: "chat_channel",
      entityId: channel.id,
      payload: { name, type },
    })

    return NextResponse.json({ channel }, { status: 201 })
  }
)
