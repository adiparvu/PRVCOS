import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { revokeSession } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const PRV_SESSION_COOKIE = "prv_session"

async function handleLogout(req: NextRequest) {
  // Revoke PRV session from Redis
  const sessionId = req.cookies.get(PRV_SESSION_COOKIE)?.value
  if (sessionId) {
    await revokeSession(sessionId).catch(() => undefined)
  }

  // Sign out of Supabase
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()

  const loginUrl = new URL(
    "/auth/login",
    process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000"
  )
  const res = NextResponse.redirect(loginUrl)
  res.cookies.delete(PRV_SESSION_COOKIE)
  return res
}

export async function POST(req: NextRequest) {
  return handleLogout(req)
}

// Support GET for simple link-based logout (e.g., email links)
export async function GET(req: NextRequest) {
  return handleLogout(req)
}
