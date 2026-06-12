import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { pushTokens } from "@prv/db/schema"
import { eq, and } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// POST /api/mobile/push-token — register or refresh an Expo push token for this device
export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const { token, deviceId, platform } = body as Record<string, unknown>

  if (typeof token !== "string" || !token.startsWith("ExponentPushToken[")) {
    return NextResponse.json({ error: "token must be a valid Expo push token." }, { status: 422 })
  }
  if (typeof deviceId !== "string" || deviceId.trim() === "") {
    return NextResponse.json({ error: "deviceId is required." }, { status: 422 })
  }

  const safePlatform =
    platform === "ios" || platform === "android" ? (platform as string) : "unknown"

  // Upsert: one active token per device — update if deviceId already exists
  await db
    .insert(pushTokens)
    .values({
      userId: ctx.userId,
      companyId: ctx.companyId,
      token,
      deviceId: deviceId.trim(),
      platform: safePlatform,
      isActive: true,
      lastUsedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: pushTokens.deviceId,
      set: {
        token,
        userId: ctx.userId,
        companyId: ctx.companyId,
        platform: safePlatform,
        isActive: true,
        lastUsedAt: new Date(),
      },
    })

  return NextResponse.json({ ok: true })
})

// DELETE /api/mobile/push-token — deregister the token for this device on logout
export const DELETE = withMobileAuth(async (req: NextRequest, ctx) => {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const { deviceId } = body as Record<string, unknown>
  if (typeof deviceId !== "string" || deviceId.trim() === "") {
    return NextResponse.json({ error: "deviceId is required." }, { status: 422 })
  }

  await db
    .update(pushTokens)
    .set({ isActive: false })
    .where(and(eq(pushTokens.deviceId, deviceId.trim()), eq(pushTokens.userId, ctx.userId)))

  return NextResponse.json({ ok: true })
})
