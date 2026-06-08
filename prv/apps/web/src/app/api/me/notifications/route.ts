import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import { db } from "@prv/db"
import { notificationPreferences } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { eq, and } from "drizzle-orm"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const patchSchema = z.object({
  inApp: z.boolean().optional(),
  push: z.boolean().optional(),
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
  quietHoursStart: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
  quietHoursEnd: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
})

export const GET = withGates(
  { action: "user.preferences.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, ctx.session.userId),
          eq(notificationPreferences.companyId, ctx.session.companyId)
        )
      )
      .limit(1)

    if (rows.length === 0) {
      return NextResponse.json({
        inApp: true,
        push: true,
        email: true,
        sms: false,
        quietHoursStart: null,
        quietHoursEnd: null,
      })
    }

    const r = rows[0]!
    return NextResponse.json({
      inApp: r.inApp,
      push: r.push,
      email: r.email,
      sms: r.sms,
      quietHoursStart: r.quietHoursStart ?? null,
      quietHoursEnd: r.quietHoursEnd ?? null,
    })
  }
)

export const PATCH = withGates(
  { action: "user.preferences.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 422 })
    }

    const updates = parsed.data
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    await db
      .insert(notificationPreferences)
      .values({
        userId: ctx.session.userId,
        companyId: ctx.session.companyId,
        ...updates,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [notificationPreferences.userId, notificationPreferences.companyId],
        set: { ...updates, updatedAt: new Date() },
      })

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "user.notifications.update",
      entityType: "notification_preferences",
      entityId: ctx.session.userId,
      payload: updates,
      method: "PATCH",
      path: "/api/me/notifications",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ ok: true })
  }
)
