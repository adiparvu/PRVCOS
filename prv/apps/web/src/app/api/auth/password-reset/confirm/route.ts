import { NextRequest, NextResponse } from "next/server"
import { db } from "@prv/db"
import { passwordResetTokens } from "@prv/db/schema"
import { eq } from "drizzle-orm"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { revokeAllUserSessions } from "@prv/auth"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const confirmSchema = z.object({
  token: z.string().min(32),
  newPassword: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .regex(/[^A-Za-z0-9]/, "Password must contain a special character"),
})

async function sha256hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// POST /api/auth/password-reset/confirm — unauthenticated
// Verifies the token hash, updates the password via Supabase admin,
// marks token as used, and revokes all existing sessions.
export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = confirmSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 422 }
    )
  }

  const { token, newPassword } = parsed.data
  const tokenHash = await sha256hex(token)

  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1)

  if (!row) {
    return NextResponse.json(
      { error: "Invalid or expired reset token", code: "TOKEN_INVALID" },
      { status: 401 }
    )
  }

  if (row.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "Reset token has expired", code: "TOKEN_EXPIRED" },
      { status: 401 }
    )
  }

  if (row.usedAt) {
    return NextResponse.json(
      { error: "Reset token has already been used", code: "TOKEN_INVALID" },
      { status: 401 }
    )
  }

  const admin = await createSupabaseAdminClient()
  const { error: updateErr } = await admin.auth.admin.updateUserById(row.userId, {
    password: newPassword,
  })

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 })
  }

  // Mark token as used and revoke all sessions
  await Promise.all([
    db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, row.id)),
    revokeAllUserSessions(row.userId),
  ])

  return NextResponse.json({ success: true, message: "Password updated. Please log in again." })
}
