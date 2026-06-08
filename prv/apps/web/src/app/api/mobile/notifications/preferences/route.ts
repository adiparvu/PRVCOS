import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { notificationPreferences } from "@prv/db/schema"
import { eq, and } from "drizzle-orm"
import { z } from "zod"

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

export const GET = withMobileAuth(async (_req: NextRequest, ctx) => {
  const rows = await db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, ctx.userId),
        eq(notificationPreferences.companyId, ctx.companyId)
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

  const r = rows[0]
  return NextResponse.json({
    inApp: r.inApp,
    push: r.push,
    email: r.email,
    sms: r.sms,
    quietHoursStart: r.quietHoursStart ?? null,
    quietHoursEnd: r.quietHoursEnd ?? null,
  })
})

export const PATCH = withMobileAuth(async (req: NextRequest, ctx) => {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 422 }
    )
  }

  const updates = parsed.data
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 })
  }

  await db
    .insert(notificationPreferences)
    .values({
      userId: ctx.userId,
      companyId: ctx.companyId,
      ...updates,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [notificationPreferences.userId, notificationPreferences.companyId],
      set: { ...updates, updatedAt: new Date() },
    })

  return NextResponse.json({ success: true })
})
