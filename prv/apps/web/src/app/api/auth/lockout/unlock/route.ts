import { NextRequest, NextResponse } from "next/server"
import { consumeUnlockToken } from "@prv/auth"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const unlockSchema = z.object({
  token: z.string().min(32),
})

// POST /api/auth/lockout/unlock — unauthenticated, one-time link handler
// Consumes the unlock token emailed to the user and clears their lockout.
export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = unlockSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 422 })
  }

  try {
    await consumeUnlockToken(parsed.data.token)
    return NextResponse.json({ success: true, message: "Account unlocked. You may now log in." })
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN"
    if (message === "UNLOCK_TOKEN_EXPIRED") {
      return NextResponse.json(
        { error: "Unlock link has expired. Request a new one.", code: "TOKEN_EXPIRED" },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: "Invalid unlock token.", code: "TOKEN_INVALID" },
      { status: 401 }
    )
  }
}
