import { NextRequest, NextResponse } from "next/server"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { webauthnCredentials, userMfaMethods } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { sessionFromRequest } from "@/lib/webauthn"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// DELETE /api/auth/passkeys/[id] — remove one of the user's own passkeys.
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const session = await sessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const id = req.nextUrl.pathname.split("/").at(-1) ?? ""

  const [cred] = await db
    .select({ id: webauthnCredentials.id, credentialId: webauthnCredentials.credentialId })
    .from(webauthnCredentials)
    .where(and(eq(webauthnCredentials.id, id), eq(webauthnCredentials.userId, session.userId)))
    .limit(1)

  if (!cred) return NextResponse.json({ error: "Passkey not found" }, { status: 404 })

  await db.delete(webauthnCredentials).where(eq(webauthnCredentials.id, cred.id))
  await db
    .delete(userMfaMethods)
    .where(
      and(
        eq(userMfaMethods.userId, session.userId),
        eq(userMfaMethods.method, "passkey"),
        eq(userMfaMethods.identifier, cred.credentialId)
      )
    )

  void writeAuditLog({
    companyId: session.companyId,
    actorId: session.userId,
    sessionId: session.sessionId,
    action: "auth.passkey.remove",
    entityType: "webauthn_credential",
    entityId: cred.credentialId,
    payload: {},
    method: "DELETE",
    path: req.nextUrl.pathname,
    ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
    userAgent: req.headers.get("user-agent") ?? "unknown",
  })

  return NextResponse.json({ removed: true })
}
