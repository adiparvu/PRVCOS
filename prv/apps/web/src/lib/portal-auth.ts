import { createHash, randomBytes } from "node:crypto"
import { cookies } from "next/headers"
import { db } from "@prv/db"
import { portalAccounts, portalSessions } from "@prv/db/schema"
import { and, eq, gt, isNull } from "drizzle-orm"

export const PORTAL_SESSION_COOKIE = "prv_portal_session"
export const MAGIC_TOKEN_TTL_MS = 15 * 60 * 1000 // 15 minutes
export const PORTAL_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export function generateToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url")
  return { raw, hash: hashToken(raw) }
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}

export interface PortalSessionContext {
  sessionId: string
  accountId: string
  companyId: string
  portalType: "client" | "supplier" | "subcontractor" | "employee"
  clientId: string | null
  supplierId: string | null
  email: string
  name: string
}

/** Resolve the portal session from the request cookie. Returns null when absent/expired/revoked. */
export async function getPortalSession(): Promise<PortalSessionContext | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(PORTAL_SESSION_COOKIE)?.value
  if (!raw) return null

  const [row] = await db
    .select({
      sessionId: portalSessions.id,
      accountId: portalAccounts.id,
      companyId: portalSessions.companyId,
      portalType: portalAccounts.portalType,
      clientId: portalAccounts.clientId,
      supplierId: portalAccounts.supplierId,
      email: portalAccounts.email,
      name: portalAccounts.name,
      isActive: portalAccounts.isActive,
    })
    .from(portalSessions)
    .innerJoin(portalAccounts, eq(portalSessions.accountId, portalAccounts.id))
    .where(
      and(
        eq(portalSessions.tokenHash, hashToken(raw)),
        isNull(portalSessions.revokedAt),
        gt(portalSessions.expiresAt, new Date())
      )
    )
    .limit(1)

  if (!row || !row.isActive) return null

  void db
    .update(portalSessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(portalSessions.id, row.sessionId))
    .catch(() => {})

  return {
    sessionId: row.sessionId,
    accountId: row.accountId,
    companyId: row.companyId,
    portalType: row.portalType,
    clientId: row.clientId,
    supplierId: row.supplierId,
    email: row.email,
    name: row.name,
  }
}
