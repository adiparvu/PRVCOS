import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getPortalSession, type PortalSessionContext } from "@/lib/portal-auth"

export type PortalHandler = (req: NextRequest, ctx: PortalSessionContext) => Promise<NextResponse>

function unauthorized(message = "Session expired or invalid") {
  return NextResponse.json({ error: message, code: "UNAUTHORIZED" }, { status: 401 })
}

export function withPortalAuth(
  handler: PortalHandler,
  opts: { portalType?: PortalSessionContext["portalType"] } = {}
): (req: NextRequest | Request, ...args: unknown[]) => Promise<NextResponse> {
  return async (req: NextRequest | Request): Promise<NextResponse> => {
    const session = await getPortalSession()
    if (!session) return unauthorized()
    if (opts.portalType && session.portalType !== opts.portalType) {
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 })
    }
    return handler(req as NextRequest, session)
  }
}
