import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db } from "@prv/db"
import { socialProfiles } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const upsertSchema = z.object({
  platform: z.enum([
    "linkedin",
    "twitter",
    "instagram",
    "github",
    "website",
    "facebook",
    "youtube",
    "tiktok",
    "other",
  ]),
  url: z.string().url().max(2000),
  displayName: z.string().max(255).optional(),
  isPublic: z.boolean().optional().default(false),
  consentGiven: z.boolean().optional().default(false),
})

const deleteSchema = z.object({
  platform: z.enum([
    "linkedin",
    "twitter",
    "instagram",
    "github",
    "website",
    "facebook",
    "youtube",
    "tiktok",
    "other",
  ]),
})

// POST /api/me/social — upsert own social profile
export const POST = withGates(
  { action: "social_profiles.edit_own", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = upsertSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const { platform, url, displayName, isPublic, consentGiven } = parsed.data
    const now = new Date()

    await db
      .insert(socialProfiles)
      .values({
        userId: ctx.session.userId,
        companyId: ctx.session.companyId,
        platform,
        url,
        displayName: displayName ?? null,
        isPublic: isPublic ?? false,
        consentGiven: consentGiven ?? false,
        consentAt: consentGiven ? now : null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [socialProfiles.userId, socialProfiles.platform],
        set: {
          url,
          displayName: displayName ?? null,
          isPublic: isPublic ?? false,
          ...(consentGiven ? { consentGiven: true, consentAt: now, consentWithdrawnAt: null } : {}),
          ...(!isPublic && consentGiven === false ? { consentWithdrawnAt: now } : {}),
          updatedAt: now,
        },
      })

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "social_profiles.edit_own",
      entityType: "social_profiles",
      entityId: ctx.session.userId,
      payload: { platform, isPublic },
      method: "POST",
      path: "/api/me/social",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ ok: true })
  }
)

// DELETE /api/me/social — remove own social profile by platform
export const DELETE = withGates(
  { action: "social_profiles.delete_own", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = deleteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    await db
      .delete(socialProfiles)
      .where(
        and(
          eq(socialProfiles.userId, ctx.session.userId),
          eq(socialProfiles.platform, parsed.data.platform)
        )
      )

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "social_profiles.delete_own",
      entityType: "social_profiles",
      entityId: ctx.session.userId,
      payload: { platform: parsed.data.platform },
      method: "DELETE",
      path: "/api/me/social",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ ok: true })
  }
)
