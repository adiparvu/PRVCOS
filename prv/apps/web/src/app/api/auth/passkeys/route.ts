import { NextRequest, NextResponse } from "next/server"
import { db } from "@prv/db"
import { webauthnCredentials } from "@prv/db/schema"
import { desc, eq } from "drizzle-orm"
import { sessionFromRequest } from "@/lib/webauthn"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// GET /api/auth/passkeys — the user's registered passkeys (no secrets exposed).
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await sessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const rows = await db
    .select({
      id: webauthnCredentials.id,
      nickname: webauthnCredentials.nickname,
      deviceType: webauthnCredentials.deviceType,
      backedUp: webauthnCredentials.backedUp,
      createdAt: webauthnCredentials.createdAt,
      lastUsedAt: webauthnCredentials.lastUsedAt,
    })
    .from(webauthnCredentials)
    .where(eq(webauthnCredentials.userId, session.userId))
    .orderBy(desc(webauthnCredentials.createdAt))
    .limit(50)

  return NextResponse.json({
    passkeys: rows.map((r) => ({
      id: r.id,
      nickname: r.nickname,
      deviceType: r.deviceType,
      backedUp: r.backedUp,
      createdAt: r.createdAt.toISOString(),
      lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
    })),
  })
}
