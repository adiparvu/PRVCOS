import { NextRequest, NextResponse } from "next/server"
import { withPortalMobileAuth } from "@/lib/mobile/portal-auth"
import type { PortalSessionContext } from "@/lib/portal-auth"
import { markClientNotificationsSeen } from "@/lib/portal-notifications"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = withPortalMobileAuth(
  async (_req: NextRequest, ctx: PortalSessionContext): Promise<NextResponse> => {
    await markClientNotificationsSeen(ctx.accountId)
    return NextResponse.json({ ok: true })
  },
  { portalType: "client" }
)
