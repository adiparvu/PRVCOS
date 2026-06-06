import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { markAllNotificationsRead, dismissAllNotifications } from "@prv/db"
import type { GateContext } from "@prv/auth"
import type { NotificationFilter } from "@prv/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// POST /api/notifications/bulk — { operation: "mark_all_read" | "dismiss_all", filter?: NotificationFilter }
export const POST = withGates(
  { action: "notifications.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const { operation, filter = "all" } = body as {
      operation?: string
      filter?: NotificationFilter
    }

    if (operation !== "mark_all_read" && operation !== "dismiss_all") {
      return NextResponse.json(
        { error: "operation must be 'mark_all_read' or 'dismiss_all'" },
        { status: 422 }
      )
    }

    const { userId, companyId } = ctx.session

    if (operation === "mark_all_read") {
      await markAllNotificationsRead(userId, companyId, filter)
    } else {
      await dismissAllNotifications(userId, companyId, filter)
    }

    return NextResponse.json({ ok: true })
  }
)
