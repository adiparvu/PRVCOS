import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db } from "@prv/db"
import { socialProfiles, users } from "@prv/db/schema"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// GET /api/people/[id]/social — list public social profiles for a company member
export const GET = withGates(
  { action: "social_profiles.view", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const segments = req.nextUrl.pathname.split("/")
    const targetUserId = segments.at(-2) // …/people/[id]/social

    if (!targetUserId) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 })
    }

    // Verify the target user belongs to the caller's company
    const [targetUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, targetUserId), eq(users.companyId, ctx.session.companyId)))
      .limit(1)

    if (!targetUser) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const rows = await db
      .select({
        id: socialProfiles.id,
        platform: socialProfiles.platform,
        url: socialProfiles.url,
        displayName: socialProfiles.displayName,
        isPublic: socialProfiles.isPublic,
      })
      .from(socialProfiles)
      .where(
        and(
          eq(socialProfiles.userId, targetUserId),
          eq(socialProfiles.companyId, ctx.session.companyId)
        )
      )

    return NextResponse.json({ profiles: rows })
  }
)
