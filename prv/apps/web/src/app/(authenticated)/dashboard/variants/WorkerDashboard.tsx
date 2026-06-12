import { cacheMemo } from "@prv/cache"
import { queryWorkerContext } from "@prv/db"
import type { PRVSession } from "@prv/auth"
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting"
import { resolveQuickActions } from "@/lib/quick-actions"
import { GlassCard, SectionLabel, QuickActionsGrid } from "../_shared"
import { LiveShiftCard } from "../islands/LiveShiftCard"
import { WorkerTaskList, type Task } from "../islands/WorkerTaskList"
import Link from "next/link"

// ── Static mock data (seeded server-side) ─────────────────────────────────────

const INITIAL_TASKS: Task[] = [
  { id: "1", label: "Morning briefing", time: "09:00", done: true },
  { id: "2", label: "Restock shelves — Aisle 3", time: "10:00", done: true },
  { id: "3", label: "Inventory count — Section B", time: "14:00", done: false, priority: "high" },
  { id: "4", label: "End-of-day report", time: "16:30", done: false },
]

interface TeamMember {
  initials: string
  name: string
  status: "online" | "away" | "offline"
  role: string
}

const TEAM_MEMBERS: TeamMember[] = [
  { initials: "MD", name: "Mihai D.", status: "online", role: "Team Lead" },
  { initials: "IL", name: "Ioana L.", status: "online", role: "Specialist" },
  { initials: "RN", name: "Radu N.", status: "away", role: "Worker" },
  { initials: "AP", name: "Ana P.", status: "online", role: "Worker" },
  { initials: "EC", name: "Emil C.", status: "offline", role: "Worker" },
]

const STATUS_DOT: Record<TeamMember["status"], string> = {
  online: "rgba(48,209,88,0.9)",
  away: "rgba(255,159,10,0.9)",
  offline: "rgba(255,255,255,0.20)",
}

const WEEK_DAYS = [
  { day: "M", label: "Mon", worked: true, hours: "8h", today: false },
  { day: "T", label: "Tue", worked: true, hours: "8h", today: false },
  { day: "W", label: "Wed", worked: true, hours: "7.5h", today: false },
  { day: "T2", label: "Thu", worked: false, hours: "", today: true },
  { day: "F", label: "Fri", worked: false, hours: "", today: false },
]

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
  const onlineCount = TEAM_MEMBERS.filter((m) => m.status === "online").length

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
      <DashboardGreeting name={firstName} tasksToday={INITIAL_TASKS.length} />

      {/* Shift card — live client island */}
      <LiveShiftCard userId={session.userId} />

      {/* Weekly hours strip */}
      <GlassCard className="mb-3.5">
        <SectionLabel>This Week</SectionLabel>
        <div className="flex items-end gap-2 justify-between">
          {WEEK_DAYS.map(({ day, label, worked, hours, today }) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className="w-full rounded-[5px] flex items-center justify-center"
                style={{
                  height: 40,
                  background: today
                    ? "rgba(10,132,255,0.18)"
                    : worked
                      ? "rgba(255,255,255,0.10)"
                      : "rgba(255,255,255,0.04)",
                  border: today ? "1px solid rgba(10,132,255,0.30)" : "1px solid transparent",
                }}
              >
                {worked && (
                  <span
                    className="text-[9px] font-semibold"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                  >
                    {hours}
                  </span>
                )}
                {today && (
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: "rgba(10,132,255,0.90)" }}
                  >
                    •
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
            23.5h
          </span>
        </div>
      </GlassCard>

      {/* Interactive task list — client island */}
      <WorkerTaskList tasks={INITIAL_TASKS} />

      {/* Team presence */}
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
          {TEAM_MEMBERS.map((member, i) => (
            <div
              key={member.name}
              className="flex items-center gap-3 py-2"
              style={{
                borderBottom:
                  i < TEAM_MEMBERS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}
            >
              {/* Avatar with status dot */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: "rgba(255,255,255,0.10)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.65)",
                  }}
                >
                  {member.initials}
                </div>
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                  style={{
                    background: STATUS_DOT[member.status],
                    border: "1.5px solid var(--prv-bg)",
                  }}
                  aria-hidden="true"
                />
              </div>

              {/* Name + role */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>
                  {member.name}
                </p>
                <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.28)" }}>
                  {member.role}
                </p>
              </div>

              <span
                className="text-[11px] font-medium"
                style={{
                  color:
                    member.status === "online"
                      ? "rgba(48,209,88,0.80)"
                      : member.status === "away"
                        ? "rgba(255,159,10,0.80)"
                        : "rgba(255,255,255,0.22)",
                }}
              >
                {member.status === "online"
                  ? "Active"
                  : member.status === "away"
                    ? "Away"
                    : "Offline"}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

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
