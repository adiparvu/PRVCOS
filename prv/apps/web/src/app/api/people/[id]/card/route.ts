import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db } from "@prv/db"
import { digitalBusinessCards, users } from "@prv/db/schema"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// GET /api/people/[id]/card — fetch a company member's business card
export const GET = withGates(
  { action: "business_card.view_others", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const segments = req.nextUrl.pathname.split("/")
    const targetUserId = segments.at(-2) // …/people/[id]/card

    if (!targetUserId) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 })
    }

    // Verify target user belongs to caller's company
    const [targetUser] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        jobTitle: users.jobTitle,
        avatarUrl: users.avatarUrl,
        email: users.email,
        phone: users.phone,
      })
      .from(users)
      .where(and(eq(users.id, targetUserId), eq(users.companyId, ctx.session.companyId)))
      .limit(1)

    if (!targetUser) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const [card] = await db
      .select()
      .from(digitalBusinessCards)
      .where(eq(digitalBusinessCards.userId, targetUserId))
      .limit(1)

    if (!card) {
      // Return a default card shape derived from the user profile
      return NextResponse.json({
        card: {
          id: null,
          userId: targetUser.id,
          fullName: `${targetUser.firstName} ${targetUser.lastName}`,
          jobTitle: targetUser.jobTitle ?? null,
          companyName: null,
          phone: targetUser.phone ?? null,
          email: targetUser.email,
          avatarUrl: targetUser.avatarUrl ?? null,
          linkedInUrl: null,
          publicSlug: null,
          isPublic: false,
        },
      })
    }

    return NextResponse.json({
      card: {
        id: card.id,
        userId: card.userId,
        fullName: `${targetUser.firstName} ${targetUser.lastName}`,
        jobTitle: card.headline ?? targetUser.jobTitle ?? null,
        companyName: null,
        phone: card.phone ?? targetUser.phone ?? null,
        email: card.email ?? targetUser.email,
        avatarUrl: card.avatarUrl ?? targetUser.avatarUrl ?? null,
        linkedInUrl: null,
        publicSlug: card.publicSlug ?? null,
        isPublic: card.isPublic,
      },
    })
  }
)
