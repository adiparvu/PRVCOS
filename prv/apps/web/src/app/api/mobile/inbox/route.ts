import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { notifications } from "@prv/db/schema"
import { eq, and, desc, sql } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type FilterType = "all" | "unread" | "alerts" | "approvals" | "messages" | "tasks" | "system"

function filterConditions(userId: string, companyId: string, filter: FilterType) {
  const base = [
    eq(notifications.userId, userId),
    eq(notifications.companyId, companyId),
    eq(notifications.isDismissed, false),
  ]
  switch (filter) {
    case "unread":
      return and(...base, eq(notifications.isRead, false))
    case "alerts":
      return and(...base, sql`${notifications.type} IN ('warning', 'error')`)
    case "approvals":
      return and(...base, eq(notifications.type, "action_required"))
    case "messages":
      return and(...base, eq(notifications.entityType, "message"))
    case "tasks":
      return and(...base, eq(notifications.entityType, "task"))
    case "system":
      return and(...base, eq(notifications.entityType, "system"))
    default:
      return and(...base)
  }
}

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url)
  const rawFilter = searchParams.get("filter") ?? "all"
  const filter = ["all", "unread", "alerts", "approvals", "messages", "tasks", "system"].includes(
    rawFilter
  )
    ? (rawFilter as FilterType)
    : "all"
  const limit = 40

  const rows = await db
    .select()
    .from(notifications)
    .where(filterConditions(ctx.userId, ctx.companyId, filter))
    .orderBy(desc(notifications.createdAt))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const items = rows.slice(0, limit)

  const [unreadRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, ctx.userId),
        eq(notifications.companyId, ctx.companyId),
        eq(notifications.isDismissed, false),
        eq(notifications.isRead, false)
      )
    )

  return NextResponse.json({
    items: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body ?? "",
      entityType: n.entityType ?? "system",
      entityId: n.entityId ?? null,
      isRead: n.isRead,
      metadata: n.metadata,
      createdAt: n.createdAt.toISOString(),
    })),
    hasMore,
    nextCursor: hasMore ? items[items.length - 1]!.createdAt.toISOString() : null,
    unreadCount: unreadRow?.count ?? 0,
  })
})

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("markRead"), id: z.string().uuid() }),
  z.object({ action: z.literal("markAllRead") }),
  z.object({ action: z.literal("dismiss"), id: z.string().uuid() }),
])

export const PATCH = withMobileAuth(async (req: NextRequest, ctx) => {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 422 })
  }

  const now = new Date()

  if (parsed.data.action === "markAllRead") {
    await db
      .update(notifications)
      .set({ isRead: true, readAt: now })
      .where(
        and(
          eq(notifications.userId, ctx.userId),
          eq(notifications.companyId, ctx.companyId),
          eq(notifications.isRead, false)
        )
      )
  } else if (parsed.data.action === "markRead") {
    await db
      .update(notifications)
      .set({ isRead: true, readAt: now })
      .where(and(eq(notifications.id, parsed.data.id), eq(notifications.userId, ctx.userId)))
  } else {
    await db
      .update(notifications)
      .set({ isDismissed: true, dismissedAt: now })
      .where(and(eq(notifications.id, parsed.data.id), eq(notifications.userId, ctx.userId)))
  }

  return NextResponse.json({ success: true })
})
