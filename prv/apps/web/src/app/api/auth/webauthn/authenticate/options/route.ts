import { NextRequest, NextResponse } from "next/server"
import {
  generateAuthenticationOptions,
  type AuthenticatorTransportFuture,
} from "@simplewebauthn/server"
import { db } from "@prv/db"
import { webauthnCredentials } from "@prv/db/schema"
import { eq } from "drizzle-orm"
import { getRedis } from "@prv/cache"
import { rpConfig, sessionFromRequest } from "@/lib/webauthn"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await sessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const { rpID } = rpConfig(req)
  const userId = session.userId

  const creds = await db
    .select({
      credentialId: webauthnCredentials.credentialId,
      transports: webauthnCredentials.transports,
    })
    .from(webauthnCredentials)
    .where(eq(webauthnCredentials.userId, userId))

  if (creds.length === 0) {
    return NextResponse.json({ error: "No passkeys registered" }, { status: 400 })
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    allowCredentials: creds.map((c) => ({
      id: c.credentialId,
      transports: (c.transports as AuthenticatorTransportFuture[]) ?? undefined,
    })),
  })

  await getRedis().set(`webauthn:auth:${userId}`, options.challenge, { ex: 300 })
  return NextResponse.json(options)
}
