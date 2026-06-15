import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { db } from "@prv/db"
import { anomalyDetections } from "@prv/db/schema"
import { eq, and, isNull, desc } from "drizzle-orm"
import { GlassCard, SectionLabel } from "@/app/(authenticated)/dashboard/_shared"

export const dynamic = "force-dynamic"
export const metadata = { title: "Known Issues" }

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 2) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const SEVERITY_MAP = {
  high: { color: "rgba(255,99,90,0.9)", bg: "rgba(255,99,90,0.12)" },
  medium: { color: "rgba(255,179,64,0.9)", bg: "rgba(255,179,64,0.12)" },
  low: { color: "rgba(80,220,120,0.9)", bg: "rgba(80,220,120,0.12)" },
} as const

export default async function KnownIssuesPage() {
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

  const rows = await db
    .select()
    .from(anomalyDetections)
    .where(
      and(
        eq(anomalyDetections.companyId, companyId),
        isNull(anomalyDetections.resolvedAt)
      )
    )
    .orderBy(desc(anomalyDetections.createdAt))
    .limit(30)

  const openCount = rows.length

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1
          className="text-[22px] font-semibold tracking-tight"
          style={{ color: "var(--prv-text-1)" }}
        >
          Known Issues
        </h1>
        {openCount > 0 && (
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(255,179,64,0.15)",
              color: "rgba(255,179,64,0.9)",
              border: "1px solid rgba(255,179,64,0.25)",
            }}
          >
            {openCount} open
          </span>
        )}
      </div>

      {/* Severity filter pills (static UI) */}
      <div className="flex gap-2 mb-5">
        {["All", "High", "Medium", "Low"].map((label, i) => (
          <span
            key={label}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-full"
            style={{
              background: i === 0 ? "rgba(255,255,255,0.12)" : "var(--prv-g1)",
              color: i === 0 ? "var(--prv-text-1)" : "var(--prv-text-3)",
              border: "1px solid var(--prv-border-subtle)",
            }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Issues list */}
      <GlassCard>
        <SectionLabel>Open Issues</SectionLabel>
        {rows.length === 0 ? (
          <p className="text-[13px] text-center py-6" style={{ color: "var(--prv-text-3)" }}>
            No open issues
          </p>
        ) : (
          <div className="flex flex-col gap-0">
            {rows.map((row, i) => {
              const sev = row.severity as keyof typeof SEVERITY_MAP
              const s = SEVERITY_MAP[sev] ?? SEVERITY_MAP.low
              return (
                <div
                  key={row.id}
                  className="flex items-start gap-3 py-3"
                  style={{
                    borderBottom:
                      i < rows.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
                  }}
                >
                  {/* Severity badge */}
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-[6px] mt-0.5 shrink-0 capitalize"
                    style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}33` }}
                  >
                    {row.severity}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p
                        className="text-[13px] font-medium leading-tight truncate"
                        style={{ color: "var(--prv-text-1)" }}
                      >
                        {row.title}
                      </p>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-[5px] shrink-0"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          color: "var(--prv-text-3)",
                          border: "1px solid var(--prv-border-subtle)",
                        }}
                      >
                        {row.domain}
                      </span>
                    </div>
                    {row.description && (
                      <p
                        className="text-[12px] truncate"
                        style={{ color: "var(--prv-text-3)" }}
                      >
                        {row.description}
                      </p>
                    )}
                  </div>

                  {/* Time */}
                  <p className="text-[11px] shrink-0" style={{ color: "var(--prv-text-3)" }}>
                    {timeAgo(row.createdAt)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </GlassCard>
    </div>
  )
}
