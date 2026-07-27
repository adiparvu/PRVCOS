import { NextRequest, NextResponse } from "next/server"
import { withPortalAuth } from "@/lib/portal-middleware"
import type { PortalSessionContext } from "@/lib/portal-auth"
import { markClientNotificationsSeen } from "@/lib/portal-notifications"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Marks the account's notifications high-water mark; badge resets to 0.
export const POST = withPortalAuth(
  async (_req: NextRequest, ctx: PortalSessionContext): Promise<NextResponse> => {
    await markClientNotificationsSeen(ctx.accountId)
    return NextResponse.json({ ok: true })
  },
  { portalType: "client" }
)
