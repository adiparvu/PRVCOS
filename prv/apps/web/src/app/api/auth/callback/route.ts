import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

// Supabase Auth callback — handles OAuth and Magic Link redirects.
// After code exchange, checks AAL to determine if MFA was completed
// and routes to MFA verification if required (P-03).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Safety: only allow same-origin redirects
      const redirectTarget = new URL(next, origin)
      if (redirectTarget.origin !== origin) {
        return NextResponse.redirect(new URL("/dashboard", origin))
      }

      // Check if the user needs to complete MFA (AAL1 session, AAL2 required)
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aalData?.nextLevel === "aal2" && aalData.nextLevel !== aalData.currentLevel) {
        // User has MFA enrolled and must complete it before proceeding
        const factors = await supabase.auth.mfa.listFactors()
        const totpFactor = factors.data?.totp?.[0]
        if (totpFactor) {
          const verifyUrl = new URL("/auth/verify", origin)
          verifyUrl.searchParams.set("factorId", totpFactor.id)
          verifyUrl.searchParams.set("next", next)
          return NextResponse.redirect(verifyUrl)
        }
      }

      return NextResponse.redirect(redirectTarget)
    }
  }

  return NextResponse.redirect(new URL("/auth/login?error=callback_failed", origin))
}
