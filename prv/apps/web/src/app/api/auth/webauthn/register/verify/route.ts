import { NextRequest, NextResponse } from "next/server"
import { verifyRegistrationResponse, type RegistrationResponseJSON } from "@simplewebauthn/server"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { webauthnCredentials, userMfaMethods } from "@prv/db/schema"
import { getRedis } from "@prv/cache"
import { rpConfig, sessionFromRequest } from "@/lib/webauthn"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await sessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const { rpID, origin } = rpConfig(req)
  const userId = session.userId

  const body = (await req.json().catch(() => null)) as {
    response?: RegistrationResponseJSON
    nickname?: string
  } | null
  if (!body?.response) return NextResponse.json({ error: "Missing response" }, { status: 400 })

  const redis = getRedis()
  const expectedChallenge = await redis.get<string>(`webauthn:reg:${userId}`)
  if (!expectedChallenge)
    return NextResponse.json({ error: "Registration expired, retry" }, { status: 400 })

  let verification
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    })
  } catch {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 })
  }
  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Could not verify passkey" }, { status: 400 })
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo
  const publicKeyB64 = Buffer.from(credential.publicKey).toString("base64url")

  const [inserted] = await db
    .insert(webauthnCredentials)
    .values({
      userId,
      credentialId: credential.id,
      publicKey: publicKeyB64,
      counter: credential.counter,
      transports: credential.transports ?? [],
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      nickname: body.nickname?.slice(0, 100) ?? null,
    })
    .onConflictDoNothing()
    .returning({ id: webauthnCredentials.id })

  if (inserted) {
    await db.insert(userMfaMethods).values({
      userId,
      method: "passkey",
      identifier: credential.id,
      isVerified: true,
      verifiedAt: new Date(),
    })
  }

  await redis.del(`webauthn:reg:${userId}`)

  void writeAuditLog({
    companyId: session.companyId,
    actorId: userId,
    sessionId: session.sessionId,
    action: "auth.passkey.register",
    entityType: "webauthn_credential",
    entityId: credential.id,
    payload: { deviceType: credentialDeviceType, backedUp: credentialBackedUp },
    method: "POST",
    path: "/api/auth/webauthn/register/verify",
    ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
    userAgent: req.headers.get("user-agent") ?? "unknown",
  })

  return NextResponse.json({ verified: true }, { status: 201 })
}
