import { NextRequest, NextResponse } from "next/server"
import {
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
} from "@simplewebauthn/server"
import { confirmReauth, writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { webauthnCredentials } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { getRedis } from "@prv/cache"
import { rpConfig, sessionFromRequest } from "@/lib/webauthn"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Verify a passkey assertion and, on success, confirm step-up re-auth for the
// current session (a passkey is a strong second factor for sensitive actions).
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await sessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const { rpID, origin } = rpConfig(req)
  const userId = session.userId

  const body = (await req.json().catch(() => null)) as {
    response?: AuthenticationResponseJSON
  } | null
  if (!body?.response?.id) return NextResponse.json({ error: "Missing response" }, { status: 400 })

  const [cred] = await db
    .select()
    .from(webauthnCredentials)
    .where(
      and(
        eq(webauthnCredentials.userId, userId),
        eq(webauthnCredentials.credentialId, body.response.id)
      )
    )
    .limit(1)
  if (!cred) return NextResponse.json({ error: "Unknown passkey" }, { status: 404 })

  const redis = getRedis()
  const expectedChallenge = await redis.get<string>(`webauthn:auth:${userId}`)
  if (!expectedChallenge)
    return NextResponse.json({ error: "Challenge expired, retry" }, { status: 400 })

  let verification
  try {
    verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: cred.credentialId,
        publicKey: new Uint8Array(Buffer.from(cred.publicKey, "base64url")),
        counter: cred.counter,
        transports: (cred.transports as AuthenticatorTransportFuture[]) ?? undefined,
      },
    })
  } catch {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 })
  }
  if (!verification.verified) {
    return NextResponse.json({ error: "Could not verify passkey" }, { status: 400 })
  }

  await db
    .update(webauthnCredentials)
    .set({ counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() })
    .where(eq(webauthnCredentials.id, cred.id))

  await redis.del(`webauthn:auth:${userId}`)
  await confirmReauth(session.sessionId)

  void writeAuditLog({
    companyId: session.companyId,
    actorId: userId,
    sessionId: session.sessionId,
    action: "auth.passkey.stepup",
    entityType: "webauthn_credential",
    entityId: cred.credentialId,
    payload: {},
    method: "POST",
    path: "/api/auth/webauthn/authenticate/verify",
    ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
    userAgent: req.headers.get("user-agent") ?? "unknown",
  })

  return NextResponse.json({ verified: true })
}
