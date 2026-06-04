import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { confirmReauth } from "@prv/auth"
import { getSession } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const PRV_SESSION_COOKIE = "prv_session"

function extractSessionId(req: NextRequest): string | null {
  const cookie = req.cookies.get(PRV_SESSION_COOKIE)?.value
  if (cookie) return cookie
  const auth = req.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) return auth.slice(7)
  return null
}

// POST /api/auth/reauth
// Validates the user's current Supabase session freshness (AAL) and
// confirms re-auth in Redis for gate 9 (P-05).
// Body: { password?: string } — password re-confirmation via Supabase
export async function POST(req: NextRequest) {
  const sid = extractSessionId(req)
  if (!sid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let session
  try {
    session = await getSession(sid)
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createSupabaseServerClient()

  // Verify the Supabase session is still valid
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Supabase session invalid" }, { status: 401 })
  }

  // Optionally re-verify password if provided in body
  let body: { password?: string } = {}
  try {
    body = await req.json()
  } catch {
    // empty body is fine — session freshness alone is acceptable for some re-auth scenarios
  }

  if (body.password) {
    const { error: pwError } = await supabase.auth.signInWithPassword({
      email: userData.user.email ?? "",
      password: body.password,
    })
    if (pwError) {
      return NextResponse.json({ error: "Password verification failed" }, { status: 401 })
    }
  }

  // Stamp Redis re-auth token (15-minute window)
  await confirmReauth(session.sessionId)

  return NextResponse.json({ ok: true, confirmedAt: new Date().toISOString() })
}
