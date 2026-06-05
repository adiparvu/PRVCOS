import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { withGates } from "@/lib/with-gates"
import { db } from "@prv/db"
import { mfaBackupCodes } from "@prv/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const verifySchema = z.object({
  factorId: z.string().min(1),
  code: z.string().length(6).regex(/^\d+$/),
})

async function sha256hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function generateBackupCode(): string {
  // 8-char alphanumeric (uppercase), e.g. "A3K9P2MX"
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  return Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => chars[b % chars.length])
    .join("")
}

// POST /api/auth/totp/verify — verify a TOTP code and activate the factor;
// on success generates 10 backup codes stored hashed in DB
export const POST = withGates(
  { action: "auth.totp.verify", endpointClass: "auth", requireMfa: false },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = verifySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const supabase = await createSupabaseServerClient()
    const { factorId, code } = parsed.data

    // Create a challenge then immediately verify
    const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
      factorId,
    })
    if (challengeErr || !challengeData) {
      return NextResponse.json(
        { error: challengeErr?.message ?? "Challenge failed" },
        { status: 400 }
      )
    }

    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    })

    if (verifyErr) {
      return NextResponse.json({ error: "Invalid TOTP code", code: "MFA_FAILED" }, { status: 401 })
    }

    // Generate + store 10 backup codes
    const plainCodes: string[] = []
    const rows: { userId: string; codeHash: string }[] = []

    for (let i = 0; i < 10; i++) {
      const plain = generateBackupCode()
      const hash = await sha256hex(plain)
      plainCodes.push(plain)
      rows.push({ userId: ctx.session.userId, codeHash: hash })
    }

    // Replace any existing backup codes
    await db.delete(mfaBackupCodes).where(eq(mfaBackupCodes.userId, ctx.session.userId))
    await db.insert(mfaBackupCodes).values(rows)

    return NextResponse.json({
      success: true,
      backupCodes: plainCodes,
      message: "Store these backup codes securely — they will not be shown again.",
    })
  }
)
