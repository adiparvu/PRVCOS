import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { checkRateLimit } from "@prv/cache"
import { isOriginAllowed, isStateChanging } from "@/lib/origin-check"

// Allowed CORS origins for API routes (P-09)
const ALLOWED_ORIGINS = new Set(
  (process.env["ALLOWED_ORIGINS"] ?? process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
)

// Routes that require authentication
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/command",
  "/operations",
  "/people",
  "/finance",
  "/intelligence",
  "/settings",
]

// Routes that are only for unauthenticated users (redirect to dashboard if signed in)
const AUTH_ONLY_ROUTES = ["/auth/login", "/auth/register", "/auth/signup"]

// Auth endpoints get the strictest rate limit class
const AUTH_PREFIXES = ["/auth/", "/api/auth/"]

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = getClientIp(request)

  // ── CSRF origin verification (P0.4) ────────────────────────────────────
  // State-changing API requests carrying a browser Origin must come from our
  // own host or the allow-list. Requests without Origin (native apps, curl,
  // server-to-server) pass — they carry no ambient cookies to ride on.
  if (pathname.startsWith("/api/") && isStateChanging(request.method)) {
    const origin = request.headers.get("origin")
    const host = request.headers.get("host")
    if (!isOriginAllowed(origin, host, ALLOWED_ORIGINS)) {
      return new NextResponse(
        JSON.stringify({ error: "Cross-origin request rejected", code: "ORIGIN_FORBIDDEN" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      )
    }
  }

  // ── Edge rate limiting (before any DB/session work) ────────────────────
  // Fail-open on limiter errors: if Redis is unreachable, serving traffic
  // unthrottled beats a total outage. The per-user limits in the gate chain
  // and auth wrappers stay fail-closed — this is only the coarse per-IP edge.
  const isAuthRoute = AUTH_PREFIXES.some((p) => pathname.startsWith(p))
  const rlClass = isAuthRoute ? "auth" : "public"
  try {
    const rl = await checkRateLimit(rlClass, ip)
    if (!rl.success) {
      return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": String(rl.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rl.reset),
        },
      })
    }
  } catch (err) {
    console.error("[middleware] rate limiter unavailable, failing open:", err)
  }

  // ── Supabase session refresh ───────────────────────────────────────────
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect unauthenticated users away from protected routes
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/auth/login"
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from auth-only routes
  const isAuthOnly = AUTH_ONLY_ROUTES.some((p) => pathname.startsWith(p))
  if (isAuthOnly && user) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = "/dashboard"
    dashboardUrl.search = ""
    return NextResponse.redirect(dashboardUrl)
  }

  // Security headers (CSP, HSTS, X-Frame-Options, …) are set in ONE place:
  // next.config.ts headers(). A second, divergent copy used to live here and
  // the two policies drifted — audit item D5.

  // ── CORS for /api/* routes ─────────────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin") ?? ""
    if (ALLOWED_ORIGINS.has(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin)
      response.headers.set("Access-Control-Allow-Credentials", "true")
      response.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
      response.headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization")
      response.headers.set("Vary", "Origin")
    }
    // OPTIONS preflight
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: response.headers })
    }
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|api/inngest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
