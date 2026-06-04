import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@prv/db"
import { userPreferences, DEFAULT_APPEARANCE } from "@prv/db/schema"
import { withGates } from "@/lib/with-gates"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const updateSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  glassStyle: z.enum(["translucid", "tinted", "adaptive"]).optional(),
  syncEnabled: z.boolean().optional(),
})

// GET /api/preferences — protected via withGates (P-08)
export const GET = withGates(
  { action: "user.preferences.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, ctx.session.userId))
      .limit(1)

    if (rows.length === 0) return NextResponse.json(DEFAULT_APPEARANCE)

    const { theme, glassStyle, syncEnabled } = rows[0]!
    return NextResponse.json({ theme, glassStyle, syncEnabled })
  }
)

// PATCH /api/preferences — protected via withGates (P-08)
export const PATCH = withGates(
  { action: "user.preferences.update", endpointClass: "api_write" },
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
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    await db
      .insert(userPreferences)
      .values({
        userId: ctx.session.userId,
        theme: patch.theme ?? DEFAULT_APPEARANCE.theme,
        glassStyle: patch.glassStyle ?? DEFAULT_APPEARANCE.glassStyle,
        syncEnabled: patch.syncEnabled ?? DEFAULT_APPEARANCE.syncEnabled,
        syncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          ...(patch.theme !== undefined ? { theme: patch.theme } : {}),
          ...(patch.glassStyle !== undefined ? { glassStyle: patch.glassStyle } : {}),
          ...(patch.syncEnabled !== undefined ? { syncEnabled: patch.syncEnabled } : {}),
          updatedAt: new Date(),
          syncedAt: new Date(),
        },
      })

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "user.preferences.update",
      entityType: "user_preferences",
      entityId: ctx.session.userId,
      payload: patch,
      method: "PATCH",
      path: "/api/preferences",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ ok: true })
  }
)
