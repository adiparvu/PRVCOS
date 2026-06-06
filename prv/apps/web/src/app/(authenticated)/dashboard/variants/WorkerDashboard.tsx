import { cacheMemo } from "@prv/cache"
import { queryWorkerContext } from "@prv/db"
import type { PRVSession } from "@prv/auth"
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting"
import { resolveQuickActions } from "@/lib/quick-actions"
import { GlassCard, SectionLabel, QuickActionsGrid } from "../_shared"
import { LiveShiftCard } from "../islands/LiveShiftCard"
import Link from "next/link"

const TASKS = [
  { id: "1", label: "Morning briefing", time: "09:00", done: true },
  { id: "2", label: "Restock shelves — Aisle 3", time: "10:00", done: true },
  { id: "3", label: "Inventory count — Section B", time: "14:00", done: false },
  { id: "4", label: "End-of-day report", time: "16:30", done: false },
]

const TEAM_INITIALS = ["MD", "IL", "RN", "AP", "EC"]

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
  const doneCount = TASKS.filter((t) => t.done).length

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
      <DashboardGreeting name={firstName} tasksToday={TASKS.length} />

      {/* Shift card — live client island with real-time countdown */}
      <LiveShiftCard userId={session.userId} />

      {/* Tasks */}
      <GlassCard className="mb-3.5">
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Tasks today · {TASKS.length}</SectionLabel>
          <span className="text-[11px]" style={{ color: "var(--prv-text-3)" }}>
            {doneCount} done
          </span>
        </div>
        <div className="flex flex-col">
          {TASKS.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 py-2.5 border-b last:border-b-0"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              <span
                className="w-4 h-4 rounded-full flex-shrink-0 border"
                style={{
                  background: task.done ? "rgba(80,220,120,0.20)" : "transparent",
                  borderColor: task.done ? "rgba(80,220,120,0.60)" : "rgba(255,255,255,0.20)",
                }}
                aria-hidden="true"
              />
              <span
                className="flex-1 text-[13px] leading-snug"
                style={{
                  color: task.done ? "var(--prv-text-3)" : "var(--prv-text-2)",
                  textDecoration: task.done ? "line-through" : "none",
                }}
              >
                {task.label}
              </span>
              <span className="text-[11px]" style={{ color: "var(--prv-text-3)" }}>
                {task.time}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Team presence */}
      <GlassCard className="mb-3.5">
        <SectionLabel>Your team on shift</SectionLabel>
        <div className="flex items-center gap-2">
          {TEAM_INITIALS.map((initials) => (
            <div
              key={initials}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1.5px solid rgba(0,0,0,0.6)",
                color: "var(--prv-text-2)",
              }}
              aria-label={initials}
            >
              {initials}
            </div>
          ))}
          <span className="text-[12px] ml-1" style={{ color: "var(--prv-text-3)" }}>
            +3 more
          </span>
        </div>
      </GlassCard>

      {/* Active projects (if any) */}
      {activeProjectCount > 0 && (
        <GlassCard className="mb-3.5">
          <SectionLabel>Active projects · {activeProjectCount}</SectionLabel>
          <Link
            href="/projects"
            className="text-[13px] font-medium"
            style={{ color: "var(--prv-text-2)" }}
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
