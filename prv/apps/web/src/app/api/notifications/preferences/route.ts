import { withGates } from "@/lib/with-gates"
import { writeAuditLog } from "@prv/auth"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { notificationPreferences } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface NotificationPreferencesRow {
  inApp: boolean
  push: boolean
  email: boolean
  sms: boolean
  quietHoursStart: string | null
  quietHoursEnd: string | null
  updatedAt: string
}

export const GET = withGates(
  { action: "notifications.preferences.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { userId, companyId } = ctx.session

    const [row] = await db
      .select({
        inApp: notificationPreferences.inApp,
        push: notificationPreferences.push,
        email: notificationPreferences.email,
        sms: notificationPreferences.sms,
        quietHoursStart: notificationPreferences.quietHoursStart,
        quietHoursEnd: notificationPreferences.quietHoursEnd,
        updatedAt: notificationPreferences.updatedAt,
      })
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.companyId, companyId)
        )
      )
      .limit(1)

    // Return defaults when no preference row exists yet
    const prefs: NotificationPreferencesRow = row
      ? {
          inApp: row.inApp,
          push: row.push,
          email: row.email,
          sms: row.sms,
          quietHoursStart: row.quietHoursStart,
          quietHoursEnd: row.quietHoursEnd,
          updatedAt: row.updatedAt.toISOString(),
        }
      : {
          inApp: true,
          push: true,
          email: true,
          sms: false,
          quietHoursStart: null,
          quietHoursEnd: null,
          updatedAt: new Date().toISOString(),
        }

    return NextResponse.json({ preferences: prefs })
  }
)

export const PATCH = withGates(
  { action: "notifications.preferences.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { userId, companyId } = ctx.session
    const body = (await req.json()) as {
      inApp?: boolean
      push?: boolean
      email?: boolean
      sms?: boolean
      quietHoursStart?: string | null
      quietHoursEnd?: string | null
    }

    // Validate quiet hours format (HH:MM)
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/
    if (body.quietHoursStart !== undefined && body.quietHoursStart !== null) {
      if (!timePattern.test(body.quietHoursStart)) {
        return NextResponse.json(
          { error: "quietHoursStart must be HH:MM format (e.g. 22:00)" },
          { status: 400 }
        )
      }
    }
    if (body.quietHoursEnd !== undefined && body.quietHoursEnd !== null) {
      if (!timePattern.test(body.quietHoursEnd)) {
        return NextResponse.json(
          { error: "quietHoursEnd must be HH:MM format (e.g. 07:00)" },
          { status: 400 }
        )
      }
    }

    // Build update payload — only include defined fields
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (body.inApp !== undefined) updates.inApp = body.inApp
    if (body.push !== undefined) updates.push = body.push
    if (body.email !== undefined) updates.email = body.email
    if (body.sms !== undefined) updates.sms = body.sms
    if (body.quietHoursStart !== undefined) updates.quietHoursStart = body.quietHoursStart
    if (body.quietHoursEnd !== undefined) updates.quietHoursEnd = body.quietHoursEnd

    // Upsert — insert defaults on first save, update fields on subsequent saves
    const [upserted] = await db
      .insert(notificationPreferences)
      .values({
        userId,
        companyId,
        inApp: body.inApp ?? true,
        push: body.push ?? true,
        email: body.email ?? true,
        sms: body.sms ?? false,
        quietHoursStart: body.quietHoursStart ?? null,
        quietHoursEnd: body.quietHoursEnd ?? null,
      })
      .onConflictDoUpdate({
        target: [notificationPreferences.userId, notificationPreferences.companyId],
        set: updates,
      })
      .returning()

    if (!upserted) {
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    await writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "notifications.preferences.update",
      entityType: "notification_preferences",
      entityId: upserted.id,
      payload: updates,
    })

    const prefs: NotificationPreferencesRow = {
      inApp: upserted.inApp,
      push: upserted.push,
      email: upserted.email,
      sms: upserted.sms,
      quietHoursStart: upserted.quietHoursStart,
      quietHoursEnd: upserted.quietHoursEnd,
      updatedAt: upserted.updatedAt.toISOString(),
    }

    return NextResponse.json({ preferences: prefs })
  }
)
