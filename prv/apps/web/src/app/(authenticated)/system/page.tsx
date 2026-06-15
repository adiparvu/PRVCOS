import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { cacheMemo } from "@prv/cache"
import { querySpecialistRoleData } from "@prv/db"
import { GlassCard, SectionLabel } from "@/app/(authenticated)/dashboard/_shared"
import Link from "next/link"

export const dynamic = "force-dynamic"
export const metadata = { title: "System · PRV" }

export default async function SystemPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  let session
  try {
    session = await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  let roleData
  try {
    roleData = await cacheMemo(
      "system_health",
      session.userId,
      () => querySpecialistRoleData("system_administrator", session.companyId, session.userId),
      { ttl: 30 }
    )
  } catch {
    roleData = null
  }

  const health = roleData?.systemHealth ?? []
  const stats = roleData?.stats
  const anomalies = roleData?.anomalies ?? []
  const auditErrors = roleData?.auditErrors ?? []

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="text-[13px] font-medium mb-0.5" style={{ color: "var(--prv-text-3)" }}>
          PRV
        </p>
        <h1
          className="text-[26px] font-semibold tracking-tight leading-tight"
          style={{ color: "var(--prv-text-1)" }}
        >
          System
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: "var(--prv-text-3)" }}>
          Infrastructure &amp; Health
        </p>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-3.5">
          {[
            { label: "Members", value: stats.memberCount },
            { label: "Online", value: stats.activePresence },
            { label: "Events today", value: stats.auditCountToday },
            { label: "Open anomalies", value: stats.openAnomalies },
          ].map((s) => (
            <GlassCard key={s.label}>
              <p
                className="text-[11px] font-semibold uppercase tracking-widest mb-1"
                style={{ color: "var(--prv-text-3)" }}
              >
                {s.label}
              </p>
              <p
                className="text-[28px] font-bold tracking-tight"
                style={{ color: "var(--prv-text-1)" }}
              >
                {s.value}
              </p>
            </GlassCard>
          ))}
        </div>
      )}

      {/* System Health */}
      <GlassCard className="mb-3.5">
        <SectionLabel>System Health</SectionLabel>
        {health.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between py-2.5 border-b last:border-b-0"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                style={{ background: item.ok ? "rgba(80,220,120,0.9)" : "rgba(255,99,90,0.9)" }}
              />
              <span className="text-[13px]" style={{ color: "var(--prv-text-2)" }}>
                {item.label}
              </span>
            </div>
            <span
              className="text-[11px] font-medium"
              style={{ color: item.ok ? "rgba(80,220,120,0.75)" : "rgba(255,99,90,0.75)" }}
            >
              {item.status}
            </span>
          </div>
        ))}
      </GlassCard>

      {/* Open Anomalies */}
      {anomalies.length > 0 && (
        <GlassCard className="mb-3.5">
          <SectionLabel>Open Anomalies · {anomalies.length}</SectionLabel>
          {anomalies.map((a) => {
            const color =
              a.severity === "high"
                ? "rgba(255,99,90,0.9)"
                : a.severity === "medium"
                  ? "rgba(255,179,64,0.9)"
                  : "rgba(80,220,120,0.9)"
            const bg =
              a.severity === "high"
                ? "rgba(255,59,48,0.14)"
                : a.severity === "medium"
                  ? "rgba(255,159,10,0.14)"
                  : "rgba(48,209,88,0.14)"
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 py-2.5 border-b last:border-b-0"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded-[6px] flex-shrink-0 uppercase"
                  style={{ background: bg, color }}
                >
                  {a.severity}
                </span>
                <span className="flex-1 text-[13px]" style={{ color: "var(--prv-text-2)" }}>
                  {a.title}
                </span>
                <span className="text-[11px]" style={{ color: "var(--prv-text-3)" }}>
                  {a.domain}
                </span>
              </div>
            )
          })}
        </GlassCard>
      )}

      {/* Recent Access Failures */}
      {auditErrors.length > 0 && (
        <GlassCard className="mb-3.5">
          <SectionLabel>Recent Access Failures · {auditErrors.length}</SectionLabel>
          {auditErrors.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-3 py-2.5 border-b last:border-b-0"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              <span
                className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                style={{ background: "rgba(255,99,90,0.9)" }}
              />
              <span
                className="flex-1 text-[12px] font-mono truncate"
                style={{ color: "var(--prv-text-2)" }}
              >
                {e.action}
                {e.path ? ` · ${e.path}` : ""}
              </span>
              <span className="text-[11px] flex-shrink-0" style={{ color: "var(--prv-text-3)" }}>
                {e.timeAgo}
              </span>
            </div>
          ))}
        </GlassCard>
      )}

      <Link
        href="/audit"
        className="text-[13px] font-medium"
        style={{ color: "var(--prv-text-3)" }}
      >
        View full audit log →
      </Link>
    </div>
  )
}
