import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server"
import { withGates } from "@/lib/with-gates"
import { db } from "@prv/db"
import { mfaBackupCodes } from "@prv/db/schema"
import { eq } from "drizzle-orm"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// POST /api/auth/totp/enroll — begin TOTP enrollment, returns QR URI + plain secret
export const POST = withGates(
  { action: "auth.totp.enroll", endpointClass: "auth", requireMfa: false },
  async (_req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" })

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Enrollment failed" }, { status: 400 })
    }

    return NextResponse.json({
      factorId: data.id,
      qrCodeUrl: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    })
  }
)

// DELETE /api/auth/totp — disable TOTP for the authenticated user
export const DELETE = withGates(
  { action: "auth.totp.disable", endpointClass: "auth", requireMfa: true, requireReauth: true },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const supabase = await createSupabaseServerClient()
    const admin = createSupabaseAdminClient()

    // List TOTP factors
    const { data: factorsData, error: listErr } = await supabase.auth.mfa.listFactors()
    if (listErr) {
      return NextResponse.json({ error: listErr.message }, { status: 400 })
    }

    const totpFactor = factorsData?.totp?.[0]
    if (!totpFactor) {
      return NextResponse.json({ error: "No TOTP factor enrolled" }, { status: 404 })
    }

    // Unenroll the factor via admin client so we don't need the user's JWT dance
    const { error: unenrollErr } = await admin.auth.admin.mfa.deleteFactor({
      userId: ctx.session.userId,
      factorId: totpFactor.id,
    })

    if (unenrollErr) {
      return NextResponse.json({ error: unenrollErr.message }, { status: 400 })
    }

    // Remove all stored backup codes for this user
    await db.delete(mfaBackupCodes).where(eq(mfaBackupCodes.userId, ctx.session.userId))

    return NextResponse.json({ success: true })
  }
)
