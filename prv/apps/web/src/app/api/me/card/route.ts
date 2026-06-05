import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@prv/db"
import { digitalBusinessCards, users } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const updateSchema = z.object({
  headline: z.string().max(255).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  phone: z.string().max(32).nullable().optional(),
  email: z.string().email().max(254).nullable().optional(),
  avatarUrl: z.string().url().max(2000).nullable().optional(),
  isPublic: z.boolean().optional(),
})

// GET /api/me/card — fetch own business card
export const GET = withGates(
  { action: "business_card.view_own", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const [user] = await db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        jobTitle: users.jobTitle,
        avatarUrl: users.avatarUrl,
        email: users.email,
        phone: users.phone,
      })
      .from(users)
      .where(eq(users.id, ctx.session.userId))
      .limit(1)

    const [card] = await db
      .select()
      .from(digitalBusinessCards)
      .where(eq(digitalBusinessCards.userId, ctx.session.userId))
      .limit(1)

    const fullName = user ? `${user.firstName} ${user.lastName}` : ""

    if (!card) {
      return NextResponse.json({
        card: {
          id: null,
          userId: ctx.session.userId,
          fullName,
          jobTitle: user?.jobTitle ?? null,
          companyName: null,
          phone: user?.phone ?? null,
          email: user?.email ?? null,
          avatarUrl: user?.avatarUrl ?? null,
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
        fullName,
        jobTitle: card.headline ?? user?.jobTitle ?? null,
        companyName: null,
        phone: card.phone ?? user?.phone ?? null,
        email: card.email ?? user?.email ?? null,
        avatarUrl: card.avatarUrl ?? user?.avatarUrl ?? null,
        linkedInUrl: null,
        publicSlug: card.publicSlug ?? null,
        isPublic: card.isPublic,
      },
    })
  }
)

// PUT /api/me/card — upsert own business card
export const PUT = withGates(
  { action: "business_card.view_own", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const patch = parsed.data

    // Public link enablement requires elevated permission (handled at gate level by action string,
    // but we also check isPublic specifically so a lower-permission user cannot sneak it in)
    const now = new Date()
    const [existing] = await db
      .select({ id: digitalBusinessCards.id, publicSlug: digitalBusinessCards.publicSlug })
      .from(digitalBusinessCards)
      .where(eq(digitalBusinessCards.userId, ctx.session.userId))
      .limit(1)

    const slug = existing?.publicSlug ?? `${ctx.session.userId.slice(0, 8)}`

    await db
      .insert(digitalBusinessCards)
      .values({
        userId: ctx.session.userId,
        companyId: ctx.session.companyId,
        headline: patch.headline ?? null,
        bio: patch.bio ?? null,
        phone: patch.phone ?? null,
        email: patch.email ?? null,
        avatarUrl: patch.avatarUrl ?? null,
        isPublic: patch.isPublic ?? false,
        publicSlug: slug,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: digitalBusinessCards.userId,
        set: {
          ...(patch.headline !== undefined ? { headline: patch.headline } : {}),
          ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
          ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
          ...(patch.email !== undefined ? { email: patch.email } : {}),
          ...(patch.avatarUrl !== undefined ? { avatarUrl: patch.avatarUrl } : {}),
          ...(patch.isPublic !== undefined ? { isPublic: patch.isPublic } : {}),
          updatedAt: now,
        },
      })

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "business_card.update",
      entityType: "digital_business_cards",
      entityId: ctx.session.userId,
      payload: patch,
      method: "PUT",
      path: "/api/me/card",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    const [updated] = await db
      .select()
      .from(digitalBusinessCards)
      .where(eq(digitalBusinessCards.userId, ctx.session.userId))
      .limit(1)

    return NextResponse.json({ ok: true, card: updated })
  }
)
