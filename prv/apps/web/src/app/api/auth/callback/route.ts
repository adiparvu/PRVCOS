import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

// Supabase Auth callback — handles OAuth and Magic Link redirects
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const redirectUrl = new URL(next, origin)
      // Safety: only allow same-origin redirects
      if (redirectUrl.origin === origin) {
        return NextResponse.redirect(redirectUrl)
      }
      return NextResponse.redirect(new URL("/dashboard", origin))
    }
  }

  // Exchange failed or no code — redirect to error page
  return NextResponse.redirect(new URL("/auth/login?error=callback_failed", origin))
}
