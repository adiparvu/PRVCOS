import { NextRequest, NextResponse } from "next/server"
import { db } from "@prv/db"
import { portalSessions } from "@prv/db/schema"
import { eq } from "drizzle-orm"
import { getPortalSession, PORTAL_SESSION_COOKIE, hashToken } from "@/lib/portal-auth"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// POST /api/portal/auth/logout
// Revokes the active portal session and clears the cookie.
export async function POST(_req: NextRequest) {
  const cookieStore = await cookies()
  const raw = cookieStore.get(PORTAL_SESSION_COOKIE)?.value

  if (raw) {
    void db
      .update(portalSessions)
      .set({ revokedAt: new Date() })
      .where(eq(portalSessions.tokenHash, hashToken(raw)))
      .catch(() => {})
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(PORTAL_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "strict",
    path: "/portal",
    maxAge: 0,
  })
  return res
}
