import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@prv/db"
import { portalAccounts, portalMagicTokens, portalSessions } from "@prv/db/schema"
import { and, eq, gt, isNull } from "drizzle-orm"
import {
  generateToken,
  hashToken,
  PORTAL_SESSION_COOKIE,
  PORTAL_SESSION_TTL_MS,
} from "@/lib/portal-auth"
import { enforceRateLimit } from "@prv/cache"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const verifySchema = z.object({
  token: z.string().min(1),
})

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  )
}

// POST /api/portal/auth/verify
// Accepts { token } (raw token from magic link URL). Validates hash against
// portalMagicTokens (not expired, not used). Creates a portalSessions record,
// sets prv_portal_session cookie, marks magic token as used.
export async function POST(req: NextRequest) {
  const ipAddress = getIp(req)
  const userAgent = req.headers.get("user-agent") ?? ""

  // Rate limit: 20 attempts per IP per 5 minutes (token guessing protection)
  try {
    await enforceRateLimit("auth", ipAddress)
  } catch {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later.", code: "RATE_LIMITED" },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = verifySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid token", code: "INVALID_TOKEN" }, { status: 422 })
  }

  const tokenHash = hashToken(parsed.data.token)

  const [tokenRow] = await db
    .select({
      id: portalMagicTokens.id,
      accountId: portalMagicTokens.accountId,
      usedAt: portalMagicTokens.usedAt,
    })
    .from(portalMagicTokens)
    .where(
      and(
        eq(portalMagicTokens.tokenHash, tokenHash),
        isNull(portalMagicTokens.usedAt),
        gt(portalMagicTokens.expiresAt, new Date())
      )
    )
    .limit(1)

  if (!tokenRow) {
    return NextResponse.json(
      { error: "Invalid or expired token.", code: "INVALID_TOKEN" },
      { status: 401 }
    )
  }

  const [account] = await db
    .select({
      id: portalAccounts.id,
      companyId: portalAccounts.companyId,
      portalType: portalAccounts.portalType,
      email: portalAccounts.email,
      name: portalAccounts.name,
      isActive: portalAccounts.isActive,
    })
    .from(portalAccounts)
    .where(eq(portalAccounts.id, tokenRow.accountId))
    .limit(1)

  if (!account || !account.isActive) {
    return NextResponse.json(
      { error: "Account is inactive.", code: "ACCOUNT_INACTIVE" },
      { status: 403 }
    )
  }

  // Mark magic token as used and create session atomically
  const { raw: sessionToken, hash: sessionHash } = generateToken()
  const expiresAt = new Date(Date.now() + PORTAL_SESSION_TTL_MS)

  await db.transaction(async (tx) => {
    await tx
      .update(portalMagicTokens)
      .set({ usedAt: new Date() })
      .where(eq(portalMagicTokens.id, tokenRow.id))

    await tx.insert(portalSessions).values({
      accountId: account.id,
      companyId: account.companyId,
      tokenHash: sessionHash,
      expiresAt,
      ipAddress,
      userAgent,
    })

    await tx
      .update(portalAccounts)
      .set({ lastLoginAt: new Date() })
      .where(eq(portalAccounts.id, account.id))
  })

  const res = NextResponse.json(
    {
      ok: true,
      portalType: account.portalType,
      name: account.name,
    },
    { status: 200 }
  )

  res.cookies.set(PORTAL_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "strict",
    path: "/portal",
    maxAge: Math.floor(PORTAL_SESSION_TTL_MS / 1000),
  })

  return res
}
