import type { Metadata } from "next"
import Link from "next/link"
import { BusinessCard } from "@/components/business-card/BusinessCard"
import { PublicCardActions } from "./PublicCardActions"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ slug: string }>
}

async function fetchPublicCard(slug: string) {
  try {
    // Server-side fetch — relative URL won't work; use internal db read instead
    const { db } = await import("@prv/db")
    const { digitalBusinessCards, users } = await import("@prv/db/schema")
    const { eq } = await import("drizzle-orm")

    const [card] = await db
      .select()
      .from(digitalBusinessCards)
      .where(eq(digitalBusinessCards.publicSlug, slug))
      .limit(1)

    if (!card || !card.isPublic) return null

    const [owner] = await db
      .select({ firstName: users.firstName, lastName: users.lastName, jobTitle: users.jobTitle })
      .from(users)
      .where(eq(users.id, card.userId))
      .limit(1)

    // Increment view count
    void db
      .update(digitalBusinessCards)
      .set({ viewCount: card.viewCount + 1, lastViewedAt: new Date() })
      .where(eq(digitalBusinessCards.id, card.id))

    return {
      fullName: owner ? `${owner.firstName} ${owner.lastName}` : "Unknown",
      jobTitle: card.headline ?? owner?.jobTitle ?? null,
      phone: card.phone,
      email: card.email,
      avatarUrl: card.avatarUrl,
      publicSlug: card.publicSlug,
      isPublic: card.isPublic,
      id: card.id,
      userId: card.userId,
      companyName: null,
      linkedInUrl: null,
    }
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const card = await fetchPublicCard(slug)
  if (!card) return { title: "Business Card" }
  return {
    title: `${card.fullName} — PRV`,
    description: card.jobTitle ?? undefined,
    openGraph: {
      title: card.fullName,
      description: card.jobTitle ?? undefined,
      images: card.avatarUrl ? [{ url: card.avatarUrl }] : [],
    },
  }
}

export default async function PublicCardPage({ params }: Props) {
  const { slug } = await params
  const card = await fetchPublicCard(slug)

  if (!card) {
    return (
      <div className="min-h-svh flex items-center justify-center" style={{ background: "#000" }}>
        <div className="text-center">
          <p className="text-white/40 text-[15px]">Card not found or not public</p>
          <Link href="/" className="text-white/20 text-[13px] mt-2 block">
            Built with PRV
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-svh flex flex-col items-center justify-center gap-8 px-4 py-12"
      style={{ background: "#000000" }}
    >
      {/* Glass card */}
      <BusinessCard card={card} />

      {/* Public page actions */}
      <PublicCardActions card={card} />

      {/* Footer */}
      <p className="text-white/15 text-[11px]">Built with PRV</p>
    </div>
  )
}
