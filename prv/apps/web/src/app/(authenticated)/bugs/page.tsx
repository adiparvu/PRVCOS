import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { db } from "@prv/db"
import { auditLogs } from "@prv/db/schema"
import { eq, and, gt, desc } from "drizzle-orm"
import { GlassCard, SectionLabel } from "@/app/(authenticated)/dashboard/_shared"

export const dynamic = "force-dynamic"
export const metadata = { title: "Access Failures" }

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 2) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const GATE_LABELS: Record<number, string> = {
  1: "Authentication",
  2: "Identity",
  3: "Permission",
  4: "Scope",
  5: "Rate Limit",
  6: "DLP",
  7: "Integrity",
  8: "Audit",
  9: "Policy",
}

export default async function BugsPage() {
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
      id: auditLogs.id,
      action: auditLogs.action,
      path: auditLogs.path,
      gateFailed: auditLogs.gateFailed,
      errorCode: auditLogs.errorCode,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(and(eq(auditLogs.companyId, companyId), gt(auditLogs.gateFailed, 0)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(40)

  const total = rows.length

  // Count by gate
  const gateCounts: Record<number, number> = {}
  for (const r of rows) {
    gateCounts[r.gateFailed] = (gateCounts[r.gateFailed] ?? 0) + 1
  }
  const topGate =
    Object.entries(gateCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1
          className="text-[22px] font-semibold tracking-tight"
          style={{ color: "var(--prv-text-1)" }}
        >
          Access Failures
        </h1>
        {total > 0 && (
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(255,99,90,0.15)",
              color: "rgba(255,99,90,0.9)",
              border: "1px solid rgba(255,99,90,0.25)",
            }}
          >
            {total}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <GlassCard className="text-center py-3">
          <p className="text-[22px] font-bold" style={{ color: "rgba(255,99,90,0.9)" }}>
            {total}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--prv-text-3)" }}>
            Total Failures
          </p>
        </GlassCard>
        <GlassCard className="text-center py-3">
          <p
            className="text-[22px] font-bold"
            style={{ color: topGate ? "rgba(255,179,64,0.9)" : "var(--prv-text-3)" }}
          >
            {topGate ? `Gate ${topGate}` : "—"}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--prv-text-3)" }}>
            {topGate ? GATE_LABELS[Number(topGate)] ?? "Unknown" : "No failures"}
          </p>
        </GlassCard>
      </div>

      {/* Failure list */}
      <GlassCard>
        <SectionLabel>Recent Access Failures</SectionLabel>
        {rows.length === 0 ? (
          <p className="text-[13px] text-center py-6" style={{ color: "var(--prv-text-3)" }}>
            No access failures recorded
          </p>
        ) : (
          <div className="flex flex-col gap-0">
            {rows.map((row, i) => (
              <div
                key={row.id}
                className="flex items-start gap-3 py-3"
                style={{
                  borderBottom:
                    i < rows.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
                }}
              >
                {/* Gate badge */}
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-[6px] mt-0.5 shrink-0"
                  style={{
                    background: "rgba(255,99,90,0.12)",
                    color: "rgba(255,99,90,0.9)",
                    border: "1px solid rgba(255,99,90,0.25)",
                  }}
                >
                  G{row.gateFailed}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[13px] font-medium leading-tight truncate"
                    style={{ color: "var(--prv-text-1)" }}
                  >
                    {row.action}
                  </p>
                  {row.path && (
                    <p
                      className="text-[11px] mt-0.5 truncate font-mono"
                      style={{ color: "var(--prv-text-3)" }}
                    >
                      {row.path}
                    </p>
                  )}
                  {row.errorCode && (
                    <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,179,64,0.7)" }}>
                      {row.errorCode}
                    </p>
                  )}
                </div>

                {/* Time */}
                <p className="text-[11px] shrink-0" style={{ color: "var(--prv-text-3)" }}>
                  {timeAgo(row.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  )
}
