import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createSession, writeAuditLog } from "@prv/auth"
import type { PRVSession } from "@prv/auth"
import { db } from "@prv/db"
import { users } from "@prv/db/schema"
import { eq, and } from "drizzle-orm"

const PRV_SESSION_COOKIE = "prv_session"

const SESSION_TTL: Record<string, number> = {
  L2: 8 * 3600,
  L3: 4 * 3600,
  L4: 2 * 3600,
  L5: 3600,
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  )
}

// Supabase Auth callback — handles OAuth and Magic Link redirects.
// After code exchange, hydrates a PRV session so the gate chain works.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const redirectTarget = new URL(next, origin)
      if (redirectTarget.origin !== origin) {
        return NextResponse.redirect(new URL("/dashboard", origin))
      }

      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      const needsMfa = aalData?.nextLevel === "aal2" && aalData.nextLevel !== aalData.currentLevel

      if (needsMfa) {
        const factors = await supabase.auth.mfa.listFactors()
        const totpFactor = factors.data?.totp?.[0]
        if (totpFactor) {
          const verifyUrl = new URL("/auth/verify", origin)
          verifyUrl.searchParams.set("factorId", totpFactor.id)
          verifyUrl.searchParams.set("next", next)
          // PRV session will be created after TOTP verification
          return NextResponse.redirect(verifyUrl)
        }
      }

      // Hydrate PRV session — look up user by Supabase ID
      const {
        data: { user: supabaseUser },
      } = await supabase.auth.getUser()

      if (supabaseUser) {
        const [prvUser] = await db
          .select({
            id: users.id,
            companyId: users.companyId,
            role: users.role,
            scopeLevel: users.scopeLevel,
            securityLevel: users.securityLevel,
          })
          .from(users)
          .where(and(eq(users.supabaseId, supabaseUser.id), eq(users.isActive, true)))
          .limit(1)

        if (prvUser) {
          const now = Math.floor(Date.now() / 1000)
          const ttl = SESSION_TTL[prvUser.securityLevel] ?? SESSION_TTL["L2"]!
          const sessionId = crypto.randomUUID()
          const mfaVerified = aalData?.currentLevel === "aal2"
          const userAgent = request.headers.get("user-agent") ?? ""
          const ipAddress = getIp(request)

          const deviceId = await crypto.subtle
            .digest("SHA-256", new TextEncoder().encode(userAgent + prvUser.id))
            .then((buf) =>
              Array.from(new Uint8Array(buf))
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("")
                .slice(0, 16)
            )

          const session: PRVSession = {
            sessionId,
            userId: prvUser.id,
            companyId: prvUser.companyId,
            role: prvUser.role,
            scopeLevel: prvUser.scopeLevel,
            securityLevel: prvUser.securityLevel,
            mfaVerified,
            deviceId,
            createdAt: now,
            expiresAt: now + ttl,
            lastActiveAt: now,
          }

          await createSession(session)

          void db
            .update(users)
            .set({ lastLoginAt: new Date(), updatedAt: new Date() })
            .where(eq(users.id, prvUser.id))

          void writeAuditLog({
            companyId: prvUser.companyId,
            actorId: prvUser.id,
            sessionId,
            action: "auth.callback.session",
            entityType: "session",
            entityId: sessionId,
            method: "GET",
            path: "/api/auth/callback",
            ipAddress,
            userAgent,
          })

          const response = NextResponse.redirect(redirectTarget)
          response.cookies.set(PRV_SESSION_COOKIE, sessionId, {
            httpOnly: true,
            secure: process.env["NODE_ENV"] === "production",
            sameSite: "lax",
            path: "/",
            maxAge: ttl,
          })
          return response
        }
      }

      return NextResponse.redirect(redirectTarget)
    }
  }

  return NextResponse.redirect(new URL("/auth/login?error=callback_failed", origin))
}
