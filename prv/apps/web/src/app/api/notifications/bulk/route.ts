import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db } from "@prv/db"
import { notifications } from "@prv/db/schema"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// POST /api/notifications/bulk — mark all as read or dismiss all
export const POST = withGates(
  { action: "notifications.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const { operation } = body as { operation?: string }
    if (operation !== "mark_all_read" && operation !== "dismiss_all") {
      return NextResponse.json(
        { error: "operation must be 'mark_all_read' or 'dismiss_all'" },
        { status: 422 }
      )
    }

    const now = new Date()
    const set =
      operation === "mark_all_read"
        ? { isRead: true, readAt: now }
        : { isDismissed: true, dismissedAt: now }

    const rows = await db
      .update(notifications)
      .set(set)
      .where(
        and(
          eq(notifications.userId, ctx.session.userId),
          eq(notifications.companyId, ctx.session.companyId),
          eq(notifications.isDismissed, false)
        )
      )
      .returning({ id: notifications.id })

    return NextResponse.json({ updated: rows.length })
  }
)
