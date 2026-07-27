import { NextRequest, NextResponse } from "next/server"
import { withPortalMobileAuth } from "@/lib/mobile/portal-auth"
import type { PortalSessionContext } from "@/lib/portal-auth"
import { db } from "@prv/db"
import { portalSessions } from "@prv/db/schema"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Server-side revocation for the mobile client session — clearing the local
// token alone would leave a valid 30-day session alive.
export const POST = withPortalMobileAuth(
  async (_req: NextRequest, ctx: PortalSessionContext): Promise<NextResponse> => {
    await db
      .update(portalSessions)
      .set({ revokedAt: new Date() })
      .where(eq(portalSessions.id, ctx.sessionId))
    return NextResponse.json({ ok: true })
  },
  { portalType: "client" }
)
