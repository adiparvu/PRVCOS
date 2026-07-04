import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { notifications } from "@prv/db/schema"
import { and, desc, eq, gte } from "drizzle-orm"
import { buildDigest, type Digest, type DigestNotificationLike } from "@/lib/notification-digest"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const WINDOW_HOURS = 24

export interface DigestResponse extends Digest {
  windowHours: number
}

// GET /api/notifications/digest — the current user's daily digest: unread,
// non-dismissed notifications from the last 24h, grouped by source module.
export const GET = withGates(
  { action: "notifications.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const since = new Date(Date.now() - WINDOW_HOURS * 3_600_000)

    const rows = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        body: notifications.body,
        actionUrl: notifications.actionUrl,
        entityType: notifications.entityType,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, ctx.session.userId),
          eq(notifications.companyId, ctx.session.companyId),
          eq(notifications.isRead, false),
          eq(notifications.isDismissed, false),
          gte(notifications.createdAt, since)
        )
      )
      .orderBy(desc(notifications.createdAt))

    const items: DigestNotificationLike[] = rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      body: r.body,
      actionUrl: r.actionUrl,
      entityType: r.entityType,
      createdAt: r.createdAt.toISOString(),
    }))

    const digest = buildDigest(items)
    return NextResponse.json({ ...digest, windowHours: WINDOW_HOURS })
  }
)
