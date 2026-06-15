import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { db } from "@prv/db"
import { anomalyDetections } from "@prv/db/schema"
import { eq, sql } from "drizzle-orm"
import { GlassCard, SectionLabel } from "@/app/(authenticated)/dashboard/_shared"

export const dynamic = "force-dynamic"
export const metadata = { title: "Detection Coverage" }

export default async function CoveragePage() {
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
    .select({
      domain: anomalyDetections.domain,
      count: sql<number>`COUNT(*)::int`,
      resolved: sql<number>`COUNT(CASE WHEN resolved_at IS NOT NULL THEN 1 END)::int`,
    })
    .from(anomalyDetections)
    .where(eq(anomalyDetections.companyId, companyId))
    .groupBy(anomalyDetections.domain)

  // Sort by total count desc
  const sorted = [...rows].sort((a, b) => b.count - a.count)
  const totalDetections = sorted.reduce((s, r) => s + r.count, 0)
  const totalResolved = sorted.reduce((s, r) => s + r.resolved, 0)
  const totalOpen = totalDetections - totalResolved

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1
          className="text-[22px] font-semibold tracking-tight"
          style={{ color: "var(--prv-text-1)" }}
        >
          Detection Coverage
        </h1>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: "rgba(255,255,255,0.08)",
            color: "var(--prv-text-3)",
            border: "1px solid var(--prv-border-subtle)",
          }}
        >
          {sorted.length} domains
        </span>
      </div>

      {/* Aggregate stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Total Detected", value: totalDetections, color: "var(--prv-text-1)" },
          { label: "Resolved", value: totalResolved, color: "rgba(80,220,120,0.9)" },
          { label: "Open", value: totalOpen, color: "rgba(255,99,90,0.9)" },
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

      {/* Per-domain breakdown */}
      <GlassCard>
        <SectionLabel>Anomaly Detection by Domain</SectionLabel>
        {sorted.length === 0 ? (
          <p className="text-[13px] text-center py-6" style={{ color: "var(--prv-text-3)" }}>
            No anomaly data available
          </p>
        ) : (
          <div className="flex flex-col gap-0">
            {sorted.map((row, i) => {
              const open = row.count - row.resolved
              const pct = row.count > 0 ? Math.round((row.resolved / row.count) * 100) : 0
              return (
                <div
                  key={row.domain}
                  className="py-3"
                  style={{
                    borderBottom:
                      i < sorted.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
                  }}
                >
                  {/* Row header */}
                  <div className="flex items-center justify-between mb-2">
                    <p
                      className="text-[13px] font-medium"
                      style={{ color: "var(--prv-text-1)" }}
                    >
                      {row.domain}
                    </p>
                    <div className="flex items-center gap-2">
                      {open > 0 && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-[5px]"
                          style={{
                            background: "rgba(255,99,90,0.12)",
                            color: "rgba(255,99,90,0.9)",
                          }}
                        >
                          {open} open
                        </span>
                      )}
                      <span className="text-[11px]" style={{ color: "var(--prv-text-3)" }}>
                        {row.count} total
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background:
                          pct === 100
                            ? "rgba(80,220,120,0.9)"
                            : pct >= 50
                            ? "rgba(255,179,64,0.9)"
                            : "rgba(255,99,90,0.9)",
                      }}
                    />
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: "var(--prv-text-3)" }}>
                    {pct}% resolved — {row.resolved} of {row.count}
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
