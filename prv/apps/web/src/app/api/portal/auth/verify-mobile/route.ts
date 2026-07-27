import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@prv/db"
import { companies, portalAccounts, portalMagicTokens, portalSessions } from "@prv/db/schema"
import { and, eq, gt, isNull } from "drizzle-orm"
import { generateToken, hashToken, PORTAL_SESSION_TTL_MS } from "@/lib/portal-auth"
import { enforceRateLimit } from "@prv/cache"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// POST /api/portal/auth/verify-mobile (preview approved 2026-07).
// Exchanges the emailed 6-digit one-time code for a portal session and
// RETURNS the raw session token — the mobile app stores it and sends it as
// Bearer, which withPortalMobileAuth already validates. Unlike /verify (web)
// no cookie is set. Every failure is the same generic 401 so responses leak
// nothing about which part failed.

const bodySchema = z.object({
  email: z.string().email(),
  companySlug: z.string().min(1).max(100),
  code: z.string().regex(/^\d{6}$/),
})

const invalid = () =>
  NextResponse.json({ error: "Invalid or expired code", code: "INVALID_CODE" }, { status: 401 })

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  )
}

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  try {
    await enforceRateLimit("auth", `verify-mobile:${ip}`)
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
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return invalid()
  const { email, companySlug, code } = parsed.data

  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.slug, companySlug))
    .limit(1)
  if (!company) return invalid()

  const [account] = await db
    .select({
      id: portalAccounts.id,
      companyId: portalAccounts.companyId,
      name: portalAccounts.name,
      email: portalAccounts.email,
    })
    .from(portalAccounts)
    .where(
      and(
        eq(portalAccounts.companyId, company.id),
        eq(portalAccounts.email, email.toLowerCase()),
        eq(portalAccounts.portalType, "client"),
        eq(portalAccounts.isActive, true)
      )
    )
    .limit(1)
  if (!account) return invalid()

  // Brute-force guard on the 6-digit space: per-account attempt limiter on
  // top of the per-IP one above.
  try {
    await enforceRateLimit("auth", `verify-mobile:${account.id}`)
  } catch {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later.", code: "RATE_LIMITED" },
      { status: 429 }
    )
  }

  // The code is stored hashed and scoped to the account (a bare 6-digit code
  // is low entropy on its own).
  const [token] = await db
    .select({ id: portalMagicTokens.id })
    .from(portalMagicTokens)
    .where(
      and(
        eq(portalMagicTokens.accountId, account.id),
        eq(portalMagicTokens.tokenHash, hashToken(`${account.id}:${code}`)),
        isNull(portalMagicTokens.usedAt),
        gt(portalMagicTokens.expiresAt, new Date())
      )
    )
    .limit(1)
  if (!token) return invalid()

  const session = generateToken()
  const expiresAt = new Date(Date.now() + PORTAL_SESSION_TTL_MS)

  await db.transaction(async (tx) => {
    await tx
      .update(portalMagicTokens)
      .set({ usedAt: new Date() })
      .where(eq(portalMagicTokens.id, token.id))
    await tx.insert(portalSessions).values({
      accountId: account.id,
      companyId: account.companyId,
      tokenHash: session.hash,
      expiresAt,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent") ?? "",
    })
    await tx
      .update(portalAccounts)
      .set({ lastLoginAt: new Date() })
      .where(eq(portalAccounts.id, account.id))
  })

  return NextResponse.json({
    token: session.raw,
    accountId: account.id,
    companyId: account.companyId,
    name: account.name,
    email: account.email,
  })
}
