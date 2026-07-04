import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { channelMessages } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import {
  applyReaction,
  canModifyMessage,
  TOMBSTONE_CONTENT,
  type ReactionMap,
} from "@/lib/message-actions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function messageId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-1) ?? ""
}

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("edit"), content: z.string().min(1).max(8000) }),
  z.object({
    action: z.literal("react"),
    emoji: z.string().min(1).max(16),
    op: z.enum(["add", "remove"]),
  }),
])

async function loadMessage(id: string, companyId: string) {
  const [msg] = await db
    .select({
      id: channelMessages.id,
      userId: channelMessages.userId,
      reactions: channelMessages.reactions,
      deletedAt: channelMessages.deletedAt,
    })
    .from(channelMessages)
    .where(and(eq(channelMessages.id, id), eq(channelMessages.companyId, companyId)))
    .limit(1)
  return msg
}

// PATCH /api/communications/channels/[id]/messages/[messageId]
// action=edit (author only) or action=react (any company member).
export const PATCH = withGates(
  { action: "communications.channels.messages.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = messageId(req)
    const { companyId, userId, sessionId } = ctx.session

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
    const parsed = patchSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data

    const msg = await loadMessage(id, companyId)
    if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (msg.deletedAt) return NextResponse.json({ error: "Message deleted" }, { status: 409 })

    if (d.action === "edit") {
      if (!canModifyMessage({ authorId: msg.userId, deletedAt: null }, userId)) {
        return NextResponse.json({ error: "Not the author" }, { status: 403 })
      }
      const [updated] = await db
        .update(channelMessages)
        .set({ content: d.content, editedAt: new Date() })
        .where(and(eq(channelMessages.id, id), eq(channelMessages.companyId, companyId)))
        .returning({ id: channelMessages.id })
      void writeAuditLog({
        companyId,
        actorId: userId,
        sessionId,
        action: "communications.message.edit",
        entityType: "channel_message",
        entityId: id,
        payload: {},
        method: "PATCH",
        path: req.nextUrl.pathname,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      })
      return NextResponse.json({ id: updated?.id, edited: true })
    }

    // react
    const reactions = applyReaction((msg.reactions ?? {}) as ReactionMap, d.emoji, d.op)
    const [updated] = await db
      .update(channelMessages)
      .set({ reactions })
      .where(and(eq(channelMessages.id, id), eq(channelMessages.companyId, companyId)))
      .returning({ id: channelMessages.id })
    return NextResponse.json({ id: updated?.id, reactions })
  }
)

// DELETE — tombstone (author only): blank the content, keep the row.
export const DELETE = withGates(
  { action: "communications.channels.messages.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = messageId(req)
    const { companyId, userId, sessionId } = ctx.session

    const msg = await loadMessage(id, companyId)
    if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (
      !canModifyMessage({ authorId: msg.userId, deletedAt: msg.deletedAt ? "x" : null }, userId)
    ) {
      return NextResponse.json({ error: "Not the author" }, { status: 403 })
    }

    const [updated] = await db
      .update(channelMessages)
      .set({ deletedAt: new Date(), content: TOMBSTONE_CONTENT, reactions: {} })
      .where(and(eq(channelMessages.id, id), eq(channelMessages.companyId, companyId)))
      .returning({ id: channelMessages.id })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "communications.message.delete",
      entityType: "channel_message",
      entityId: id,
      payload: {},
      method: "DELETE",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: updated?.id, deleted: true })
  }
)
