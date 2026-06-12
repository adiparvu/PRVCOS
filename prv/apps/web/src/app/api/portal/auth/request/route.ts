import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@prv/db"
import { companies, portalAccounts, portalMagicTokens } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { generateToken, MAGIC_TOKEN_TTL_MS } from "@/lib/portal-auth"
import { sendEmail, EmailFrom, portalMagicLinkEmail } from "@prv/email"
import { enforceRateLimit } from "@prv/cache"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const requestSchema = z.object({
  email: z.string().email(),
  companySlug: z.string().min(1).max(100),
  portalType: z
    .enum(["client", "supplier", "subcontractor", "employee"])
    .optional()
    .default("client"),
})

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  )
}

// POST /api/portal/auth/request
// Accepts { email, companySlug, portalType }. Looks up the portal account,
// generates a 15-minute magic link, and emails it. Always returns 200 to
// prevent email enumeration.
export async function POST(req: NextRequest) {
  const ipAddress = getIp(req)

  // Rate limit: 5 requests per IP per 10 minutes
  try {
    await enforceRateLimit("public", ipAddress)
  } catch {
    return NextResponse.json(
      { error: "Too many requests. Please try again later.", code: "RATE_LIMITED" },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 422 }
    )
  }

  const { email, companySlug, portalType } = parsed.data

  // Look up company by slug
  const [company] = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(eq(companies.slug, companySlug))
    .limit(1)

  // Look up portal account — even if company/account not found we return 200
  // to prevent email/slug enumeration
  if (!company) {
    return NextResponse.json({ ok: true })
  }

  const [account] = await db
    .select({ id: portalAccounts.id, name: portalAccounts.name, email: portalAccounts.email })
    .from(portalAccounts)
    .where(
      and(
        eq(portalAccounts.companyId, company.id),
        eq(portalAccounts.email, email.toLowerCase()),
        eq(portalAccounts.portalType, portalType),
        eq(portalAccounts.isActive, true)
      )
    )
    .limit(1)

  if (!account) {
    return NextResponse.json({ ok: true })
  }

  // Per-account rate limit: 3 magic links per 10 minutes
  try {
    await enforceRateLimit("auth", account.id)
  } catch {
    return NextResponse.json(
      { error: "Too many requests. Please try again later.", code: "RATE_LIMITED" },
      { status: 429 }
    )
  }

  const { raw, hash } = generateToken()
  const expiresAt = new Date(Date.now() + MAGIC_TOKEN_TTL_MS)

  await db.insert(portalMagicTokens).values({
    accountId: account.id,
    tokenHash: hash,
    expiresAt,
  })

  const baseUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000"
  const magicUrl = `${baseUrl}/portal/verify?token=${encodeURIComponent(raw)}`

  const { subject, html } = portalMagicLinkEmail({
    name: account.name,
    magicUrl,
    portalType,
    companyName: company.name,
    expiresInMinutes: 15,
    ipAddress,
  })

  void sendEmail({
    to: account.email,
    from: EmailFrom.NOREPLY,
    subject,
    html,
    tags: [{ name: "type", value: "portal_magic_link" }],
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}
