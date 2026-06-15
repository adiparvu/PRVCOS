import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { db } from "@prv/db"
import { notifications } from "@prv/db/schema"
import { eq, and, inArray, desc } from "drizzle-orm"
import { GlassCard, SectionLabel } from "@/app/(authenticated)/dashboard/_shared"

export const dynamic = "force-dynamic"
export const metadata = { title: "Support Tickets" }

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 2) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const PRIORITY_MAP = {
  error: { label: "P1", color: "rgba(255,99,90,0.9)", bg: "rgba(255,99,90,0.12)" },
  action_required: { label: "P2", color: "rgba(255,179,64,0.9)", bg: "rgba(255,179,64,0.12)" },
  warning: { label: "P3", color: "rgba(255,255,255,0.35)", bg: "rgba(255,255,255,0.06)" },
} as const

export default async function TicketsPage() {
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
      id: notifications.id,
      title: notifications.title,
      body: notifications.body,
      type: notifications.type,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(
      and(
        eq(notifications.companyId, companyId),
        eq(notifications.isDismissed, false),
        inArray(notifications.type, ["error", "action_required", "warning"])
      )
    )
    .orderBy(desc(notifications.createdAt))
    .limit(40)

  const total = rows.length
  const unread = rows.filter((r) => !r.isRead).length
  const errors = rows.filter((r) => r.type === "error").length

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1
          className="text-[22px] font-semibold tracking-tight"
          style={{ color: "var(--prv-text-1)" }}
        >
          Support Tickets
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
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Total", value: total, color: "var(--prv-text-1)" },
          { label: "Unread", value: unread, color: "rgba(255,179,64,0.9)" },
          { label: "Critical", value: errors, color: "rgba(255,99,90,0.9)" },
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

      {/* Ticket list */}
      <GlassCard>
        <SectionLabel>All Tickets</SectionLabel>
        {rows.length === 0 ? (
          <p className="text-[13px] text-center py-6" style={{ color: "var(--prv-text-3)" }}>
            No open tickets
          </p>
        ) : (
          <div className="flex flex-col gap-0">
            {rows.map((row, i) => {
              const type = row.type as keyof typeof PRIORITY_MAP
              const p = PRIORITY_MAP[type] ?? PRIORITY_MAP.warning
              return (
                <div
                  key={row.id}
                  className="flex items-start gap-3 py-3"
                  style={{
                    borderBottom:
                      i < rows.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
                  }}
                >
                  {/* Priority badge */}
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-[6px] mt-0.5 shrink-0"
                    style={{ background: p.bg, color: p.color, border: `1px solid ${p.color}33` }}
                  >
                    {p.label}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[13px] font-medium leading-tight truncate"
                      style={{ color: "var(--prv-text-1)" }}
                    >
                      {row.title}
                    </p>
                    {row.body && (
                      <p
                        className="text-[12px] mt-0.5 truncate"
                        style={{ color: "var(--prv-text-3)" }}
                      >
                        {row.body}
                      </p>
                    )}
                  </div>

                  {/* Right side: time + read indicator */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <p className="text-[11px]" style={{ color: "var(--prv-text-3)" }}>
                      {timeAgo(row.createdAt)}
                    </p>
                    {!row.isRead && (
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: "rgba(80,220,120,0.9)" }}
                      />
                    )}
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
