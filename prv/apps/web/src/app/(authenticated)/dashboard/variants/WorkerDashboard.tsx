import { cacheMemo } from "@prv/cache"
import { queryWorkerContext } from "@prv/db"
import type { PRVSession } from "@prv/auth"
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting"
import { resolveQuickActions } from "@/lib/quick-actions"
import { GlassCard, SectionLabel, QuickActionsGrid } from "../_shared"
import { LiveShiftCard } from "../islands/LiveShiftCard"
import { WorkerTaskList, type Task } from "../islands/WorkerTaskList"
import Link from "next/link"

const STATUS_DOT: Record<string, string> = {
  online: "rgba(48,209,88,0.9)",
  away: "rgba(255,159,10,0.9)",
  in_meeting: "rgba(255,159,10,0.9)",
  on_break: "rgba(255,159,10,0.9)",
  busy: "rgba(255,69,58,0.9)",
  do_not_disturb: "rgba(255,69,58,0.9)",
  offline: "rgba(255,255,255,0.20)",
}

const STATUS_LABEL: Record<string, string> = {
  online: "Active",
  away: "Away",
  in_meeting: "In meeting",
  on_break: "On break",
  busy: "Busy",
  do_not_disturb: "DND",
  offline: "Offline",
}

function formatWorkedHours(minutes: number): string {
  if (minutes <= 0) return ""
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  session: PRVSession
}

export async function WorkerDashboard({ session }: Props) {
  let ctx
  try {
    ctx = await cacheMemo(
      "worker_ctx",
      `${session.userId}`,
      () => queryWorkerContext(session.userId, session.companyId),
      { ttl: 30 }
    )
  } catch {
    ctx = null
  }

  const firstName = ctx?.firstName ?? "there"
  const inboxCount = ctx?.inboxCount ?? 0
  const activeProjectCount = ctx?.activeProjectCount ?? 0
  const quickActions = resolveQuickActions(session.role)

  const teamMembers = ctx?.teamMembers ?? []
  const weekDays = ctx?.weekDays ?? []
  const onlineCount = teamMembers.filter((m) => m.presenceStatus === "online").length
  const totalWeekMinutes = weekDays.reduce((sum, d) => sum + d.workedMinutes, 0)

  const tasks: Task[] = (ctx?.todayTasks ?? []).map((t) => ({
    id: t.id,
    label: t.title,
    time: "",
    done: t.status === "done",
    priority: t.priority === "urgent" ? "high" : "normal",
  }))

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[13px] font-medium mb-0.5" style={{ color: "var(--prv-text-3)" }}>
            Today
          </p>
          <h1
            className="text-[26px] font-semibold tracking-tight leading-tight"
            style={{ color: "var(--prv-text-1)" }}
          >
            Your day
          </h1>
        </div>
        {inboxCount > 0 && (
          <Link
            href="/notifications"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-medium"
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              color: "var(--prv-text-2)",
              textDecoration: "none",
            }}
          >
            <span
              className="w-[18px] h-[18px] rounded-full text-[9px] font-bold flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.14)", color: "var(--prv-text-1)" }}
            >
              {inboxCount}
            </span>
            Inbox
          </Link>
        )}
      </div>

      {/* Greeting */}
      <DashboardGreeting name={firstName} tasksToday={tasks.length} />

      {/* Shift card — live client island */}
      <LiveShiftCard userId={session.userId} />

      {/* Weekly hours strip */}
      <GlassCard className="mb-3.5">
        <SectionLabel>This Week</SectionLabel>
        <div className="flex items-end gap-2 justify-between">
          {weekDays.map(({ date, label, workedMinutes, isClockedIn, today }) => (
            <div key={date} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className="w-full rounded-[5px] flex items-center justify-center"
                style={{
                  height: 40,
                  background: today
                    ? "rgba(10,132,255,0.18)"
                    : workedMinutes > 0
                      ? "rgba(255,255,255,0.10)"
                      : "rgba(255,255,255,0.04)",
                  border: today ? "1px solid rgba(10,132,255,0.30)" : "1px solid transparent",
                }}
              >
                {workedMinutes > 0 && !today && (
                  <span
                    className="text-[9px] font-semibold"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                  >
                    {formatWorkedHours(workedMinutes)}
                  </span>
                )}
                {today && !isClockedIn && (
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: "rgba(10,132,255,0.90)" }}
                  >
                    •
                  </span>
                )}
                {today && isClockedIn && (
                  <span
                    className="text-[9px] font-semibold"
                    style={{ color: "rgba(10,132,255,0.90)" }}
                  >
                    {formatWorkedHours(workedMinutes)}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] font-medium"
                style={{ color: today ? "rgba(10,132,255,0.90)" : "rgba(255,255,255,0.28)" }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
        <div
          className="flex items-center justify-between mt-3 pt-2.5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.40)" }}>
            Total this week
          </span>
          <span className="text-[14px] font-bold" style={{ color: "rgba(255,255,255,0.80)" }}>
            {formatWorkedHours(totalWeekMinutes) || "—"}
          </span>
        </div>
      </GlassCard>

      {/* Interactive task list — client island */}
      {tasks.length > 0 && <WorkerTaskList tasks={tasks} />}

      {/* Team presence */}
      {teamMembers.length > 0 && (
        <GlassCard className="mb-3.5">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Your team on shift</SectionLabel>
            <span
              className="text-[11px] px-2 py-0.5 rounded-[100px] font-medium"
              style={{
                background: "rgba(48,209,88,0.12)",
                color: "rgba(48,209,88,0.80)",
                border: "1px solid rgba(48,209,88,0.20)",
              }}
            >
              {onlineCount} online
            </span>
          </div>

          <div className="flex flex-col">
            {teamMembers.map((member, i) => {
              const initials = (member.firstName[0] ?? "") + (member.lastName[0] ?? "")
              const dot = STATUS_DOT[member.presenceStatus] ?? STATUS_DOT.offline!
              const statusLabel = STATUS_LABEL[member.presenceStatus] ?? "Offline"
              const isOnline = member.presenceStatus === "online"
              const isAway =
                member.presenceStatus === "away" ||
                member.presenceStatus === "in_meeting" ||
                member.presenceStatus === "on_break"

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 py-2"
                  style={{
                    borderBottom:
                      i < teamMembers.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  }}
                >
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{
                        background: "rgba(255,255,255,0.10)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "rgba(255,255,255,0.65)",
                      }}
                    >
                      {initials.toUpperCase()}
                    </div>
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                      style={{ background: dot, border: "1.5px solid var(--prv-bg)" }}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[13px] font-medium"
                      style={{ color: "rgba(255,255,255,0.75)" }}
                    >
                      {member.firstName} {member.lastName[0]}.
                    </p>
                    <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.28)" }}>
                      {member.jobTitle ?? "Worker"}
                    </p>
                  </div>

                  <span
                    className="text-[11px] font-medium"
                    style={{
                      color: isOnline
                        ? "rgba(48,209,88,0.80)"
                        : isAway
                          ? "rgba(255,159,10,0.80)"
                          : "rgba(255,255,255,0.22)",
                    }}
                  >
                    {statusLabel}
                  </span>
                </div>
              )
            })}
          </div>
        </GlassCard>
      )}

      {/* Active projects */}
      {activeProjectCount > 0 && (
        <GlassCard className="mb-3.5">
          <SectionLabel>Active projects · {activeProjectCount}</SectionLabel>
          <Link
            href="/projects"
            className="text-[13px] font-medium"
            style={{ color: "var(--prv-text-2)", textDecoration: "none" }}
          >
            View all projects →
          </Link>
        </GlassCard>
      )}

      {/* Quick Actions */}
      <QuickActionsGrid actions={quickActions} />
    </div>
  )
}
