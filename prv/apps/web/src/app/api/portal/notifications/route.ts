import { NextRequest, NextResponse } from "next/server"
import { withPortalAuth } from "@/lib/portal-middleware"
import type { PortalSessionContext } from "@/lib/portal-auth"
import { getClientNotifications } from "@/lib/portal-notifications"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Derived notifications feed for the client portal (preview approved 2026-07).
export const GET = withPortalAuth(
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
