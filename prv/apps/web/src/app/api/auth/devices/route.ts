import { NextRequest, NextResponse } from "next/server"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { userDevices } from "@prv/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { z } from "zod"
import { sessionFromRequest } from "@/lib/webauthn"
import { deviceTrustExpiry, isDeviceTrusted } from "@/lib/device-trust"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// GET /api/auth/devices — the user's known devices and their trust state.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await sessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const rows = await db
    .select({
      id: userDevices.id,
      deviceId: userDevices.deviceId,
      name: userDevices.name,
      platform: userDevices.platform,
      isTrusted: userDevices.isTrusted,
      trustExpiresAt: userDevices.trustExpiresAt,
      lastSeenAt: userDevices.lastSeenAt,
    })
    .from(userDevices)
    .where(eq(userDevices.userId, session.userId))
    .orderBy(desc(userDevices.lastSeenAt))
    .limit(50)

  const now = new Date()
  return NextResponse.json({
    devices: rows.map((d) => ({
      id: d.id,
      name: d.name,
      platform: d.platform,
      trusted: isDeviceTrusted({ isTrusted: d.isTrusted, trustExpiresAt: d.trustExpiresAt }, now),
      trustExpiresAt: d.trustExpiresAt?.toISOString() ?? null,
      lastSeenAt: d.lastSeenAt.toISOString(),
    })),
  })
}

// POST /api/auth/devices — trust the current device (skip MFA for the window).
// Requires a client-provided device UUID via the x-device-id header.
const trustSchema = z.object({ name: z.string().max(255).optional() })

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await sessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const deviceId = req.headers.get("x-device-id")
  if (!deviceId || !/^[0-9a-fA-F-]{36}$/.test(deviceId)) {
    return NextResponse.json({ error: "Missing or invalid device id" }, { status: 400 })
  }

  const raw = await req.json().catch(() => ({}))
  const parsed = trustSchema.safeParse(raw)
  const name = parsed.success ? parsed.data.name : undefined

  const now = new Date()
  const expiry = deviceTrustExpiry(now)

  await db
    .insert(userDevices)
    .values({
      userId: session.userId,
      deviceId,
      name: name ?? null,
      userAgent: req.headers.get("user-agent") ?? null,
      platform: "web",
      isTrusted: true,
      trustExpiresAt: expiry,
      lastSeenAt: now,
    })
    .onConflictDoUpdate({
      target: userDevices.deviceId,
      set: {
        isTrusted: true,
        trustExpiresAt: expiry,
        lastSeenAt: now,
        ...(name !== undefined ? { name } : {}),
      },
    })

  void writeAuditLog({
    companyId: session.companyId,
    actorId: session.userId,
    sessionId: session.sessionId,
    action: "auth.device.trust",
    entityType: "user_device",
    entityId: deviceId,
    payload: { trustExpiresAt: expiry.toISOString() },
    method: "POST",
    path: "/api/auth/devices",
    ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
    userAgent: req.headers.get("user-agent") ?? "unknown",
  })

  return NextResponse.json({ trusted: true, trustExpiresAt: expiry.toISOString() }, { status: 201 })
}
