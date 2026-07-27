import { NextRequest, NextResponse } from "next/server"
import { withPortalMobileAuth } from "@/lib/mobile/portal-auth"
import type { PortalSessionContext } from "@/lib/portal-auth"
import { getClientNotifications } from "@/lib/portal-notifications"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Mobile mirror of GET /api/portal/notifications — same derived feed.
export const GET = withPortalMobileAuth(
  async (_req: NextRequest, ctx: PortalSessionContext): Promise<NextResponse> => {
    if (!ctx.clientId) {
      return NextResponse.json(
        { error: "No client profile linked to this account" },
        { status: 403 }
      )
    }
    const feed = await getClientNotifications({
      companyId: ctx.companyId,
      clientId: ctx.clientId,
      accountId: ctx.accountId,
    })
    return NextResponse.json(feed)
  },
  { portalType: "client" }
)
