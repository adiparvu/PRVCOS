import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { queryNotificationCounts } from "@prv/db"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// GET /api/notifications/count — unread counts per category
export const GET = withGates(
  { action: "notifications.list", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { userId, companyId } = ctx.session
    const counts = await queryNotificationCounts(userId, companyId)
    return NextResponse.json(counts)
  }
)
