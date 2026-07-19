import { NextRequest, NextResponse } from "next/server"
import { generateRegistrationOptions } from "@simplewebauthn/server"
import { db } from "@prv/db"
import { webauthnCredentials, users } from "@prv/db/schema"
import { eq } from "drizzle-orm"
import { getRedis } from "@prv/cache"
import { rpConfig, sessionFromRequest } from "@/lib/webauthn"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await sessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const { rpID, rpName } = rpConfig(req)
  const userId = session.userId

  const [u] = await db
    .select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  const existing = await db
    .select({ credentialId: webauthnCredentials.credentialId })
    .from(webauthnCredentials)
    .where(eq(webauthnCredentials.userId, userId))

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: u?.email ?? userId,
    userID: new TextEncoder().encode(userId),
    userDisplayName: `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim() || (u?.email ?? userId),
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({ id: c.credentialId })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
  })

  await getRedis().set(`webauthn:reg:${userId}`, options.challenge, { ex: 300 })
  return NextResponse.json(options)
}
