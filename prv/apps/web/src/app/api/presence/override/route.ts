import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db } from "@prv/db"
import { userPresence } from "@prv/db/schema"
import { inngest } from "@prv/jobs/client"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const overrideSchema = z.object({
  status: z.enum(["online", "away", "busy", "offline", "in_meeting", "on_break", "do_not_disturb"]),
  statusMessage: z.string().max(200).nullable().optional(),
  isManualOverride: z.boolean().default(true),
  manualOverrideExpiresAt: z.string().datetime().nullable().optional(),
})

// POST /api/presence/override — manually set own presence status (with optional auto-expiry)
export const POST = withGates(
  { action: "presence.set_manual", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = overrideSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const { status, statusMessage, isManualOverride, manualOverrideExpiresAt } = parsed.data
    const now = new Date()
    const expiresAt = manualOverrideExpiresAt ? new Date(manualOverrideExpiresAt) : null

    await db
      .insert(userPresence)
      .values({
        userId: ctx.session.userId,
        companyId: ctx.session.companyId,
        status,
        statusMessage: statusMessage ?? null,
        isManualOverride,
        manualOverrideExpiresAt: expiresAt,
        lastSeenAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [userPresence.userId, userPresence.companyId],
        set: {
          status,
          statusMessage: statusMessage ?? null,
          isManualOverride,
          manualOverrideExpiresAt: expiresAt,
          lastSeenAt: now,
          updatedAt: now,
        },
      })

    // Schedule auto-expiry via Inngest if a deadline is set
    if (expiresAt && isManualOverride) {
      await inngest.send({
        name: "prv/presence.manual_set",
        data: {
          userId: ctx.session.userId,
          companyId: ctx.session.companyId,
          expiresAt: expiresAt.toISOString(),
        },
      })
    }

    return NextResponse.json({ ok: true, status })
  }
)

// DELETE /api/presence/override — clear manual override, return to online
export const DELETE = withGates(
  { action: "presence.set_manual", endpointClass: "api_write" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    await db
      .update(userPresence)
      .set({
        status: "online",
        statusMessage: null,
        isManualOverride: false,
        manualOverrideExpiresAt: null,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userPresence.userId, ctx.session.userId),
          eq(userPresence.companyId, ctx.session.companyId)
        )
      )

    return NextResponse.json({ ok: true, status: "online" })
  }
)
