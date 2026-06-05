import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@prv/db"
import { digitalBusinessCards, users } from "@prv/db/schema"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// GET /api/public/card/[slug] — public card data (no auth required)
// Only returns cards where isPublic = true
export async function GET(req: NextRequest): Promise<NextResponse> {
  const slug = req.nextUrl.pathname.split("/").pop()

  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 })
  }

  const [card] = await db
    .select()
    .from(digitalBusinessCards)
    .where(eq(digitalBusinessCards.publicSlug, slug))
    .limit(1)

  if (!card || !card.isPublic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Fetch owner name for display
  const [owner] = await db
    .select({ firstName: users.firstName, lastName: users.lastName, jobTitle: users.jobTitle })
    .from(users)
    .where(eq(users.id, card.userId))
    .limit(1)

  const fullName = owner ? `${owner.firstName} ${owner.lastName}` : "Unknown"

  // Increment view count (fire-and-forget, not a blocker)
  void db
    .update(digitalBusinessCards)
    .set({ viewCount: card.viewCount + 1, lastViewedAt: new Date() })
    .where(eq(digitalBusinessCards.id, card.id))

  return NextResponse.json({
    card: {
      id: card.id,
      fullName,
      jobTitle: card.headline ?? owner?.jobTitle ?? null,
      phone: card.phone ?? null,
      email: card.email ?? null,
      avatarUrl: card.avatarUrl ?? null,
      publicSlug: card.publicSlug,
      isPublic: card.isPublic,
    },
  })
}
