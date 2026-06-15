import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { db } from "@prv/db"
import { auditLogs } from "@prv/db/schema"
import { eq, desc, and, gte } from "drizzle-orm"
import { GlassCard, SectionLabel } from "@/app/(authenticated)/dashboard/_shared"

export const dynamic = "force-dynamic"
export const metadata = { title: "Testing Activity" }

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 2) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default async function TestingPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  let session
  try {
    session = await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  const { companyId } = session

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      gateFailed: auditLogs.gateFailed,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(and(eq(auditLogs.companyId, companyId), gte(auditLogs.createdAt, todayStart)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(50)

  const total = rows.length
  const passed = rows.filter((r) => r.gateFailed === 0).length
  const failed = rows.filter((r) => r.gateFailed > 0).length

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1
          className="text-[22px] font-semibold tracking-tight"
          style={{ color: "var(--prv-text-1)" }}
        >
          Testing Activity
        </h1>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: "rgba(255,255,255,0.08)",
            color: "var(--prv-text-3)",
            border: "1px solid var(--prv-border-subtle)",
          }}
        >
          Today
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Total Events", value: total, color: "var(--prv-text-1)" },
          { label: "Passed", value: passed, color: "rgba(80,220,120,0.9)" },
          { label: "Failed", value: failed, color: "rgba(255,99,90,0.9)" },
        ].map(({ label, value, color }) => (
          <GlassCard key={label} className="text-center py-3">
            <p className="text-[22px] font-bold" style={{ color }}>
              {value}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--prv-text-3)" }}>
              {label}
            </p>
          </GlassCard>
        ))}
      </div>

      {/* Event list */}
      <GlassCard>
        <SectionLabel>Audit Events — Today</SectionLabel>
        {rows.length === 0 ? (
          <p className="text-[13px] text-center py-6" style={{ color: "var(--prv-text-3)" }}>
            No events recorded today
          </p>
        ) : (
          <div className="flex flex-col gap-0">
            {rows.map((row, i) => {
              const ok = row.gateFailed === 0
              return (
                <div
                  key={row.id}
                  className="flex items-center gap-3 py-3"
                  style={{
                    borderBottom:
                      i < rows.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
                  }}
                >
                  {/* Pass / fail dot */}
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      background: ok ? "rgba(80,220,120,0.9)" : "rgba(255,99,90,0.9)",
                    }}
                  />

                  {/* Action + entity */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[13px] font-medium leading-tight truncate"
                      style={{ color: "var(--prv-text-1)" }}
                    >
                      {row.action}
                    </p>
                    {row.entityType && (
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--prv-text-3)" }}>
                        {row.entityType}
                      </p>
                    )}
                  </div>

                  {/* Gate + time */}
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    {!ok && (
                      <span
                        className="text-[10px] font-bold"
                        style={{ color: "rgba(255,99,90,0.9)" }}
                      >
                        Gate {row.gateFailed}
                      </span>
                    )}
                    <p className="text-[11px]" style={{ color: "var(--prv-text-3)" }}>
                      {timeAgo(row.createdAt)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </GlassCard>
    </div>
  )
}
