import { NextRequest, NextResponse } from "next/server"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { userDevices } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { sessionFromRequest } from "@/lib/webauthn"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// POST /api/auth/devices/[id]/revoke — revoke a device's trust.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await sessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const id = req.nextUrl.pathname.split("/").at(-2) ?? ""
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const [updated] = await db
    .update(userDevices)
    .set({ isTrusted: false, trustExpiresAt: null })
    .where(and(eq(userDevices.id, id), eq(userDevices.userId, session.userId)))
    .returning({ id: userDevices.id })

  if (!updated) return NextResponse.json({ error: "Device not found" }, { status: 404 })

  void writeAuditLog({
    companyId: session.companyId,
    actorId: session.userId,
    sessionId: session.sessionId,
    action: "auth.device.revoke",
    entityType: "user_device",
    entityId: id,
    payload: {},
    method: "POST",
    path: req.nextUrl.pathname,
    ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
    userAgent: req.headers.get("user-agent") ?? "unknown",
  })

  return NextResponse.json({ revoked: true })
}
