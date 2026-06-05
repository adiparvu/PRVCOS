import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import { db } from "@prv/db"
import { mfaBackupCodes } from "@prv/db/schema"
import { eq, isNull } from "drizzle-orm"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

async function sha256hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function generateBackupCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  return Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => chars[b % chars.length])
    .join("")
}

// POST /api/auth/totp/backup-codes — regenerate all backup codes
// (re-auth required — user must have just confirmed their password/TOTP)
export const POST = withGates(
  {
    action: "auth.totp.backup_codes.regenerate",
    endpointClass: "auth",
    requireMfa: true,
    requireReauth: true,
  },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const plainCodes: string[] = []
    const rows: { userId: string; codeHash: string }[] = []

    for (let i = 0; i < 10; i++) {
      const plain = generateBackupCode()
      const hash = await sha256hex(plain)
      plainCodes.push(plain)
      rows.push({ userId: ctx.session.userId, codeHash: hash })
    }

    await db.delete(mfaBackupCodes).where(eq(mfaBackupCodes.userId, ctx.session.userId))
    await db.insert(mfaBackupCodes).values(rows)

    return NextResponse.json({
      backupCodes: plainCodes,
      message: "Store these backup codes securely — they will not be shown again.",
    })
  }
)

// GET /api/auth/totp/backup-codes — return remaining (unused) backup code count
export const GET = withGates(
  { action: "auth.totp.backup_codes.status", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const unused = await db
      .select({ id: mfaBackupCodes.id })
      .from(mfaBackupCodes)
      .where(
        isNull(mfaBackupCodes.usedAt) && (eq(mfaBackupCodes.userId, ctx.session.userId) as any)
      )

    return NextResponse.json({ remainingCodes: unused.length })
  }
)
