import { NextRequest, NextResponse } from "next/server"
import { db } from "@prv/db"
import { passwordResetTokens } from "@prv/db/schema"
import { eq, and, gt, isNull } from "drizzle-orm"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { sendEmail } from "@prv/email"
import { checkRateLimit } from "@prv/cache"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const TOKEN_TTL_MS = 15 * 60 * 1000 // 15 minutes

async function sha256hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function extractIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  )
}

const requestSchema = z.object({
  email: z.string().email(),
})

// POST /api/auth/password-reset/request — unauthenticated, rate-limited
// Generates a short-lived token, stores its hash, sends email via Resend.
// Always returns 200 to prevent email enumeration.
export async function POST(req: NextRequest) {
  const ip = extractIp(req)

  // Strict rate limit: 3 per 10 minutes per IP
  const rl = await checkRateLimit("auth", `pwd_reset:${ip}`)
  if (!rl.success) {
    return NextResponse.json(
      { message: "If an account exists with that email, a reset link has been sent." },
      { status: 200 }
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
      { message: "If an account exists with that email, a reset link has been sent." },
      { status: 200 }
    )
  }

  const { email } = parsed.data
  const admin = createSupabaseAdminClient()

  const { data: userList } = await admin.auth.admin.listUsers()
  const user = userList?.users.find((u) => u.email === email)

  // Silently succeed if user not found (enumeration prevention)
  if (!user) {
    return NextResponse.json(
      { message: "If an account exists with that email, a reset link has been sent." },
      { status: 200 }
    )
  }

  const rawToken = crypto.randomUUID() + crypto.randomUUID()
  const tokenHash = await sha256hex(rawToken)
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
    ipAddress: ip,
  })

  const resetUrl = `${process.env["NEXT_PUBLIC_APP_URL"]}/auth/password-reset/confirm?token=${rawToken}`

  await sendEmail({
    to: email,
    subject: "Reset your PRV password",
    templateId: "password-reset",
    variables: {
      resetUrl,
      expiresInMinutes: "15",
      ipAddress: ip,
    },
  })

  return NextResponse.json(
    { message: "If an account exists with that email, a reset link has been sent." },
    { status: 200 }
  )
}
