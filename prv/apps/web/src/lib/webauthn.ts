import type { NextRequest } from "next/server"
import { getSession } from "@prv/auth"

export const PRV_SESSION_COOKIE = "prv_session"

/** Relying-party config derived from the request host. rpID is the hostname
 * (no port); origin is the full scheme+host the browser used. */
export function rpConfig(req: NextRequest): { rpID: string; origin: string; rpName: string } {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost"
  const proto = req.headers.get("x-forwarded-proto") ?? "https"
  const hostname = host.split(":")[0] ?? "localhost"
  return { rpID: hostname, origin: `${proto}://${host}`, rpName: "PRV" }
}

/** The PRV session for the request, or null if unauthenticated/expired. */
export async function sessionFromRequest(
  req: NextRequest
): Promise<Awaited<ReturnType<typeof getSession>> | null> {
  const sid = req.cookies.get(PRV_SESSION_COOKIE)?.value
  if (!sid) return null
  try {
    return await getSession(sid)
  } catch {
    return null
  }
}
