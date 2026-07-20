import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and, desc, isNull, lt, or } from "drizzle-orm"
import { db, queryNotificationCounts } from "@prv/db"
import { notifications } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import type { GateContext } from "@prv/auth"
import type { NotificationFilter } from "@prv/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const PAGE_SIZE = 25

const listSchema = z.object({
  // Legacy single-type filter — kept for backward compat
  type: z.enum(["info", "warning", "error", "success", "action_required"]).optional(),
  // Category-based filter used by the Notifications Center UI
  filter: z.enum(["all", "alerts", "approvals", "inbox", "system"]).optional(),
  unreadOnly: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  cursor: z.string().optional(),
  includeCounts: z
    .string()
    .transform((v) => v === "true")
    .optional(),
})

function applyFilterClause(
  filter: NotificationFilter,
  baseFilters: ReturnType<typeof eq>[]
): ReturnType<typeof eq>[] {
  switch (filter) {
    case "alerts":
      return [
        ...baseFilters,
        or(eq(notifications.type, "error"), eq(notifications.type, "warning"))!,
      ]
    case "approvals":
      return [...baseFilters, eq(notifications.type, "action_required")]
    case "inbox":
      return [
        ...baseFilters,
        or(eq(notifications.type, "info"), eq(notifications.type, "success"))!,
      ]
    case "system":
      return [...baseFilters, eq(notifications.entityType, "system")]
    default:
      return baseFilters
  }
}

// GET /api/notifications — paginated list of the authenticated user's notifications
export const GET = withGates(
  { action: "notifications.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = req.nextUrl
    const parsed = listSchema.safeParse(Object.fromEntries(searchParams))
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query params" }, { status: 400 })
    }

    const { type, filter, unreadOnly, cursor, includeCounts } = parsed.data
    const { userId, companyId } = ctx.session

    let baseFilters: ReturnType<typeof eq>[] = [
      eq(notifications.userId, userId),
      eq(notifications.companyId, companyId),
      eq(notifications.isDismissed, false),
      isNull(notifications.expiresAt),
    ]

    // Category filter takes priority over legacy type param
    if (filter && filter !== "all") {
      baseFilters = applyFilterClause(filter, baseFilters)
    } else if (type) {
      baseFilters.push(eq(notifications.type, type))
    }

    if (unreadOnly) baseFilters.push(eq(notifications.isRead, false))
    if (cursor) baseFilters.push(lt(notifications.createdAt, new Date(cursor)))

    const [rows, counts] = await Promise.all([
      db
        .select({
          id: notifications.id,
          type: notifications.type,
          channel: notifications.channel,
          title: notifications.title,
          body: notifications.body,
          actionUrl: notifications.actionUrl,
          entityType: notifications.entityType,
          entityId: notifications.entityId,
          isRead: notifications.isRead,
          readAt: notifications.readAt,
          metadata: notifications.metadata,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(and(...baseFilters))
        .orderBy(desc(notifications.createdAt))
        .limit(PAGE_SIZE + 1),
      includeCounts ? queryNotificationCounts(userId, companyId) : Promise.resolve(null),
    ])

    const hasMore = rows.length > PAGE_SIZE
    const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows
    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1]!.createdAt.toISOString() : null

    return NextResponse.json({ items, nextCursor, hasMore, counts })
  }
)

const dispatchSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(["info", "warning", "error", "success", "action_required"]).default("info"),
  title: z.string().min(1).max(500),
  body: z.string().max(5000).optional(),
  actionUrl: z.string().url().optional(),
  entityType: z.string().max(100).optional(),
  entityId: z.string().uuid().optional(),
  channel: z.enum(["in_app", "push", "email", "sms"]).default("in_app"),
  scheduledFor: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  // Critical alert: shows as a persistent banner until explicitly acknowledged.
  requiresAck: z.boolean().default(false),
})

// POST /api/notifications — dispatch a notification (internal/system use, requires admin)
export const POST = withGates(
  {
    action: "notifications.dispatch",
    endpointClass: "api_write",
    requiredScope: "SCOPE_COMPANY",
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = dispatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [row] = await db
      .insert(notifications)
      .values({
        userId: parsed.data.userId,
        companyId: ctx.session.companyId,
        type: parsed.data.type,
        channel: parsed.data.channel,
        title: parsed.data.title,
        body: parsed.data.body,
        actionUrl: parsed.data.actionUrl,
        entityType: parsed.data.entityType,
        entityId: parsed.data.entityId,
        scheduledFor: parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor) : undefined,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
        requiresAck: parsed.data.requiresAck,
        deliveredAt: !parsed.data.scheduledFor ? new Date() : undefined,
      })
      .returning({ id: notifications.id })

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "notifications.dispatch",
      entityType: "notification",
      entityId: row!.id,
      payload: { userId: parsed.data.userId, type: parsed.data.type, title: parsed.data.title },
      method: "POST",
      path: "/api/notifications",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: row!.id }, { status: 201 })
  }
)
