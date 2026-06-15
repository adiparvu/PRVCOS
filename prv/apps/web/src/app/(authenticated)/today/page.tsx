import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { cacheMemo } from "@prv/cache"
import { queryWorkerContext } from "@prv/db"
import { GlassCard, SectionLabel } from "@/app/(authenticated)/dashboard/_shared"
import Link from "next/link"

export const dynamic = "force-dynamic"
export const metadata = { title: "Today · PRV" }

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

function fmtDate(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

function fmtMinutes(mins: number): string {
  if (mins <= 0) return "—"
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const PRIORITY_COLOR: Record<string, string> = {
  high: "rgba(255,99,90,0.9)",
  medium: "rgba(255,179,64,0.9)",
  low: "rgba(80,220,120,0.9)",
  urgent: "rgba(255,99,90,0.9)",
}
const PRIORITY_BG: Record<string, string> = {
  high: "rgba(255,59,48,0.14)",
  medium: "rgba(255,159,10,0.14)",
  low: "rgba(48,209,88,0.14)",
  urgent: "rgba(255,59,48,0.14)",
}

export default async function TodayPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  let session
  try {
    session = await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  let ctx
  try {
    ctx = await cacheMemo(
      "worker_ctx",
      session.userId,
      () => queryWorkerContext(session.userId, session.companyId),
      { ttl: 60 }
    )
  } catch {
    ctx = null
  }

  const today = ctx?.weekDays.find((d) => d.today)
  const activeTasks = (ctx?.todayTasks ?? []).filter(
    (t) => t.status !== "done" && t.status !== "cancelled"
  ).slice(0, 8)

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[13px] font-medium mb-0.5" style={{ color: "var(--prv-text-3)" }}>
            {fmtDate()}
          </p>
          <h1
            className="text-[26px] font-semibold tracking-tight leading-tight"
            style={{ color: "var(--prv-text-1)" }}
          >
            {greeting()}{ctx ? `, ${ctx.firstName}` : ""}
          </h1>
        </div>
        {(ctx?.inboxCount ?? 0) > 0 && (
          <Link
            href="/notifications"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-medium"
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              color: "var(--prv-text-2)",
            }}
          >
            <span
              className="w-[18px] h-[18px] rounded-full text-[9px] font-bold flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.14)", color: "var(--prv-text-1)" }}
            >
              {ctx?.inboxCount}
            </span>
            Inbox
          </Link>
        )}
      </div>

      {/* Attendance */}
      <GlassCard className="mb-3.5">
        <SectionLabel>Today's Attendance</SectionLabel>
        <div className="flex items-center gap-3 mb-3">
          <span
            className="w-[8px] h-[8px] rounded-full flex-shrink-0"
            style={{
              background: today?.isClockedIn
                ? "rgba(80,220,120,0.9)"
                : today && today.workedMinutes > 0
                  ? "rgba(255,179,64,0.9)"
                  : "rgba(255,255,255,0.22)",
            }}
          />
          <span className="text-[14px]" style={{ color: "var(--prv-text-1)" }}>
            {today?.isClockedIn
              ? "Clocked in"
              : today && today.workedMinutes > 0
                ? `${fmtMinutes(today.workedMinutes)} worked today`
                : "Not clocked in"}
          </span>
        </div>
        {/* Week pills */}
        <div className="flex gap-2">
          {(ctx?.weekDays ?? []).map((d) => (
            <div
              key={d.date}
              className="flex-1 flex flex-col items-center gap-1 py-2 rounded-[10px]"
              style={{
                background: d.today ? "rgba(255,255,255,0.10)" : "transparent",
                border: d.today ? "1px solid rgba(255,255,255,0.18)" : "1px solid transparent",
                opacity: !d.today && d.workedMinutes === 0 ? 0.4 : 1,
              }}
            >
              <span className="text-[10px] font-medium" style={{ color: "var(--prv-text-3)" }}>
                {d.label}
              </span>
              <span
                className="w-[6px] h-[6px] rounded-full"
                style={{
                  background:
                    d.isClockedIn
                      ? "rgba(80,220,120,0.9)"
                      : d.workedMinutes > 0
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(255,255,255,0.18)",
                }}
              />
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Tasks */}
      <GlassCard className="mb-3.5">
        <SectionLabel>Today's Tasks · {activeTasks.length}</SectionLabel>
        {activeTasks.length === 0 ? (
          <p className="py-2 text-[13px]" style={{ color: "var(--prv-text-3)" }}>
            No tasks for today
          </p>
        ) : (
          activeTasks.map((task) => {
            const pc = PRIORITY_COLOR[task.priority] ?? "var(--prv-text-3)"
            const pb = PRIORITY_BG[task.priority] ?? "rgba(255,255,255,0.06)"
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 py-2.5 border-b last:border-b-0"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded-[6px] flex-shrink-0 uppercase"
                  style={{ background: pb, color: pc }}
                >
                  {task.priority}
                </span>
                <span className="flex-1 text-[13px]" style={{ color: "var(--prv-text-2)" }}>
                  {task.title}
                </span>
                <span
                  className="text-[11px] capitalize flex-shrink-0"
                  style={{ color: "var(--prv-text-3)" }}
                >
                  {task.status.replace("_", " ")}
                </span>
              </div>
            )
          })
        )}
      </GlassCard>

      {/* Team Status */}
      {(ctx?.teamMembers ?? []).length > 0 && (
        <GlassCard className="mb-3.5">
          <SectionLabel>Team</SectionLabel>
          {(ctx?.teamMembers ?? []).slice(0, 6).map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 py-2.5 border-b last:border-b-0"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="w-[32px] h-[32px] rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "var(--prv-text-2)",
                }}
              >
                {(m.firstName[0] ?? "") + (m.lastName[0] ?? "")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium" style={{ color: "var(--prv-text-1)" }}>
                  {m.firstName} {m.lastName}
                </p>
                {m.jobTitle && (
                  <p className="text-[11px]" style={{ color: "var(--prv-text-3)" }}>
                    {m.jobTitle}
                  </p>
                )}
              </div>
              <span
                className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                style={{
                  background:
                    m.presenceStatus === "online"
                      ? "rgba(80,220,120,0.9)"
                      : "rgba(255,255,255,0.18)",
                }}
              />
            </div>
          ))}
        </GlassCard>
      )}

      {/* Projects stat */}
      {(ctx?.activeProjectCount ?? 0) > 0 && (
        <Link href="/renovation">
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-widest mb-1"
                  style={{ color: "var(--prv-text-3)" }}
                >
                  Active Projects
                </p>
                <p
                  className="text-[28px] font-bold tracking-tight"
                  style={{ color: "var(--prv-text-1)" }}
                >
                  {ctx?.activeProjectCount}
                </p>
              </div>
              <span className="text-[20px]" style={{ color: "var(--prv-text-3)" }}>
                →
              </span>
            </div>
          </GlassCard>
        </Link>
      )}
    </div>
  )
}
