import { getPortalSession } from "@/lib/portal-auth"
import { db } from "@prv/db"
import { portalAccounts, portalSessions } from "@prv/db/schema"
import { and, desc, eq, gt, isNull } from "drizzle-orm"
import { redirect } from "next/navigation"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Profile" }
export const dynamic = "force-dynamic"

export default async function PortalProfilePage() {
  const session = await getPortalSession()
  if (!session || !session.clientId) redirect("/portal/login")

  const [account, activeSessions] = await Promise.all([
    db
      .select({
        id: portalAccounts.id,
        name: portalAccounts.name,
        email: portalAccounts.email,
        portalType: portalAccounts.portalType,
        lastLoginAt: portalAccounts.lastLoginAt,
        createdAt: portalAccounts.createdAt,
      })
      .from(portalAccounts)
      .where(
        and(
          eq(portalAccounts.id, session.accountId),
          eq(portalAccounts.companyId, session.companyId)
        )
      )
      .limit(1)
      .then((r) => r[0] ?? null),

    db
      .select({
        id: portalSessions.id,
        ipAddress: portalSessions.ipAddress,
        userAgent: portalSessions.userAgent,
        createdAt: portalSessions.createdAt,
        lastSeenAt: portalSessions.lastSeenAt,
      })
      .from(portalSessions)
      .where(
        and(
          eq(portalSessions.accountId, session.accountId),
          isNull(portalSessions.revokedAt),
          gt(portalSessions.expiresAt, new Date())
        )
      )
      .orderBy(desc(portalSessions.lastSeenAt))
      .limit(10),
  ])

  if (!account) redirect("/portal/login")

  const initials = account.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  function parseUA(ua: string | null | undefined) {
    if (!ua) return "Unknown device"
    if (ua.includes("iPhone")) return "iPhone"
    if (ua.includes("iPad")) return "iPad"
    if (ua.includes("Android")) return "Android"
    if (ua.includes("Mac")) return "Mac"
    if (ua.includes("Windows")) return "Windows"
    if (ua.includes("Linux")) return "Linux"
    return "Browser"
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1
        className="mb-6 text-2xl font-semibold text-white/95"
        style={{ letterSpacing: "-0.03em" }}
      >
        Profile
      </h1>

      {/* Avatar + Identity */}
      <div
        className="mb-4 flex items-center gap-5 rounded-[20px] p-5"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white/80"
          style={{
            background: "rgba(255,255,255,0.10)",
            border: "1px solid rgba(255,255,255,0.16)",
          }}
        >
          {initials}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-base font-semibold text-white/90">{account.name}</span>
          <span className="truncate text-sm text-white/45">{account.email}</span>
          <span
            className="mt-1 w-fit rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize"
            style={{
              background: "rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.50)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            {account.portalType} portal
          </span>
        </div>
      </div>

      {/* Account details */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <InfoTile
          label="Member since"
          value={new Date(account.createdAt).toLocaleDateString("ro-RO", {
            year: "numeric",
            month: "long",
          })}
        />
        {account.lastLoginAt && (
          <InfoTile
            label="Last login"
            value={new Date(account.lastLoginAt).toLocaleDateString("ro-RO")}
          />
        )}
      </div>

      {/* Security notice */}
      <div
        className="mb-6 flex items-start gap-3 rounded-[16px] p-4"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          className="mt-0.5 shrink-0"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          <path
            d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-xs leading-relaxed text-white/35">
          Your account uses passwordless magic-link authentication. To access the portal, request a
          new login link sent to your email.
        </p>
      </div>

      {/* Active sessions */}
      {activeSessions.length > 0 && (
        <div>
          <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wider text-white/35">
            Active sessions · {activeSessions.length}
          </p>
          <div
            className="overflow-hidden rounded-[20px]"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {activeSessions.map((s, i) => {
              const isCurrent = s.id === session.sessionId
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between px-5 py-4"
                  style={{
                    borderTop: i > 0 ? "1px solid rgba(255,255,255,0.07)" : undefined,
                  }}
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white/85">
                        {parseUA(s.userAgent)}
                      </span>
                      {isCurrent && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            background: "rgba(140,255,140,0.10)",
                            color: "rgba(140,255,140,0.80)",
                            border: "1px solid rgba(140,255,140,0.18)",
                          }}
                        >
                          This device
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-white/30">
                      {s.ipAddress ?? "Unknown IP"} ·{" "}
                      {new Date(s.lastSeenAt).toLocaleDateString("ro-RO")}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex flex-col gap-1 rounded-[16px] p-4"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <span className="text-[11px] text-white/35">{label}</span>
      <span className="text-sm font-medium text-white/85">{value}</span>
    </div>
  )
}
