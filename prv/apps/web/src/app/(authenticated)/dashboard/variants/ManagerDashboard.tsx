import { cacheMemo } from "@prv/cache"
import { queryManagerKpis, db } from "@prv/db"
import { auditLogs, attendanceRecords } from "@prv/db/schema"
import { and, desc, eq, sql } from "drizzle-orm"
import { auditActionToActivity } from "../_activity"
import { GlassAlertBanner } from "@prv/ui"
import type { PRVSession } from "@prv/auth"
import type { ActivityEventPayload } from "@prv/cache"
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting"
import { resolveQuickActions } from "@/lib/quick-actions"
import { GlassCard, SectionLabel, QuickActionsGrid, InlineAlert, formatCurrency } from "../_shared"
import { LiveKpiGrid } from "../islands/LiveKpiGrid"
import { LiveActivityFeed } from "../islands/LiveActivityFeed"
import Link from "next/link"

const SCOPE_LABELS: Partial<Record<PRVSession["role"], string>> = {
  store_manager: "Store",
  shop_director: "Network",
  operations_manager: "Region",
  project_director: "Portfolio",
  project_operations_manager: "Portfolio",
  oms: "Area",
  project_oms: "Portfolio",
  department_head: "Dept",
  hr_payroll: "HR",
}

// Priority items that need manager action
// NOTE: sample data — wire to real alerts/approvals once a manager-scoped
// priority feed exists.
const PRIORITY_ITEMS = [
  {
    id: "p1",
    level: "critical" as const,
    title: "Payroll approval due",
    detail: "Jun run · 24 employees · deadline today",
    href: "/payroll",
    icon: "M12 1v4M12 19v4M4.9 4.9l2.8 2.8M17.7 17.7l2.1 2.1M2 12h4M18 12h4",
  },
  {
    id: "p2",
    level: "warning" as const,
    title: "3 leave requests pending",
    detail: "Oldest: 2 days ago",
    href: "/people/time-off",
    icon: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  },
  {
    id: "p3",
    level: "info" as const,
    title: "Inventory report ready",
    detail: "Section B · 14 low-stock items",
    href: "/operations",
    icon: "M5 8h14M5 8a2 2 0 1 0 0-4h14a2 2 0 1 0 0 4M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8",
  },
]

const PRIORITY_COLORS = {
  critical: {
    bg: "rgba(255,59,48,0.08)",
    border: "rgba(255,59,48,0.18)",
    dot: "rgba(255,59,48,0.9)",
    text: "rgba(255,99,90,0.9)",
  },
  warning: {
    bg: "rgba(255,159,10,0.08)",
    border: "rgba(255,159,10,0.18)",
    dot: "rgba(255,159,10,0.9)",
    text: "rgba(255,179,64,0.9)",
  },
  info: {
    bg: "rgba(10,132,255,0.06)",
    border: "rgba(10,132,255,0.14)",
    dot: "rgba(10,132,255,0.8)",
    text: "rgba(80,160,255,0.85)",
  },
}

// Staff attendance snapshot
// Store / area performance
// NOTE: sample data — needs per-store revenue targets (no target model yet).
const STORE_PERF = [
  { name: "Cluj Main", target: 92, actual: 97, trend: "+5%" },
  { name: "Floreasca", target: 88, actual: 83, trend: "-5%" },
  { name: "Depot B", target: 80, actual: 85, trend: "+5%" },
]

interface Props {
  session: PRVSession
}

export async function ManagerDashboard({ session }: Props) {
  const periodKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
  const scopeLabel = SCOPE_LABELS[session.role] ?? "Scope"

  let kpis
  try {
    kpis = await cacheMemo(
      "mgr_kpis",
      `${session.companyId}:${session.userId}:${periodKey}`,
      () => queryManagerKpis(session.companyId, session.userId),
      { ttl: 60 }
    )
  } catch {
    kpis = null
  }

  const quickActions = resolveQuickActions(session.role)

  const initialKpis = {
    revenue: kpis?.revenue ?? "0",
    workforce: kpis?.workforce ?? 0,
    activeProjects: kpis?.activeProjects ?? 0,
    alerts: kpis?.alerts ?? 0,
    pendingApprovals: kpis?.pendingApprovals ?? 0,
  }

  // Today's staff status + the latest real activity for this company.
  const today = new Date().toISOString().slice(0, 10)
  let INITIAL_ACTIVITY: ActivityEventPayload[] = []
  let STAFF_SNAPSHOT = [
    { label: "On shift", value: 0, color: "rgba(48,209,88,0.85)" },
    { label: "Late", value: 0, color: "rgba(255,159,10,0.85)" },
    { label: "Absent", value: 0, color: "rgba(255,59,48,0.85)" },
    { label: "On leave", value: 0, color: "rgba(10,132,255,0.75)" },
  ]
  try {
    const [activityRows, attendanceCounts] = await Promise.all([
      db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          actorId: auditLogs.actorId,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .where(and(eq(auditLogs.companyId, session.companyId), eq(auditLogs.gateFailed, 0)))
        .orderBy(desc(auditLogs.createdAt))
        .limit(5),
      db
        .select({ status: attendanceRecords.status, count: sql<number>`count(*)::int` })
        .from(attendanceRecords)
        .where(
          and(eq(attendanceRecords.companyId, session.companyId), eq(attendanceRecords.date, today))
        )
        .groupBy(attendanceRecords.status),
    ])
    INITIAL_ACTIVITY = activityRows.map((r) =>
      auditActionToActivity(r.action, r.entityType ?? null, r.id, r.createdAt, r.actorId ?? null)
    )
    const cm = new Map(attendanceCounts.map((r) => [r.status, r.count]))
    STAFF_SNAPSHOT = [
      {
        label: "On shift",
        value: (cm.get("present") ?? 0) + (cm.get("clocked_out") ?? 0),
        color: "rgba(48,209,88,0.85)",
      },
      { label: "Late", value: cm.get("late") ?? 0, color: "rgba(255,159,10,0.85)" },
      { label: "Absent", value: cm.get("absent") ?? 0, color: "rgba(255,59,48,0.85)" },
      { label: "On leave", value: cm.get("leave") ?? 0, color: "rgba(10,132,255,0.75)" },
    ]
  } catch {
    // Leave the zeroed snapshot / empty activity on error.
  }

  const totalStaff = STAFF_SNAPSHOT.reduce((s, x) => s + x.value, 0)

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[13px] font-medium mb-0.5" style={{ color: "var(--prv-text-3)" }}>
            PRV
          </p>
          <h1
            className="text-[26px] font-semibold tracking-tight leading-tight"
            style={{ color: "var(--prv-text-1)" }}
          >
            Command
          </h1>
        </div>
        <div
          className="px-3 py-1.5 rounded-[10px] text-[12px] font-medium"
          style={{
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            color: "var(--prv-text-2)",
          }}
        >
          {scopeLabel}
        </div>
      </div>

      {/* Greeting */}
      <DashboardGreeting />

      {/* Critical alerts */}
      {(kpis?.alerts ?? 0) > 0 && (
        <GlassAlertBanner
          type="warning"
          title={`${kpis!.alerts} alert${kpis!.alerts === 1 ? "" : "s"} require attention`}
          description="Review pending items in your scope"
        />
      )}

      {/* Pending approvals */}
      {(kpis?.pendingApprovals ?? 0) > 0 && (
        <InlineAlert
          type="info"
          title={`${kpis!.pendingApprovals} action${kpis!.pendingApprovals === 1 ? "" : "s"} awaiting your approval`}
        />
      )}

      {/* KPI grid — live client island */}
      <LiveKpiGrid initial={initialKpis} companyId={session.companyId} variant="manager" />

      {/* Priority items */}
      <GlassCard className="mb-3.5">
        <SectionLabel>Needs Your Attention</SectionLabel>
        <div className="flex flex-col gap-2">
          {PRIORITY_ITEMS.map(({ id, level, title, detail, href, icon }) => {
            const c = PRIORITY_COLORS[level]
            return (
              <Link
                key={id}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[13px] no-underline"
                style={{
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                  textDecoration: "none",
                }}
              >
                {/* Dot indicator */}
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: c.dot }}
                />
                {/* Icon */}
                <div
                  className="w-7 h-7 rounded-[9px] flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={c.text}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={icon} />
                  </svg>
                </div>
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[13px] font-semibold leading-tight"
                    style={{ color: "rgba(255,255,255,0.85)" }}
                  >
                    {title}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {detail}
                  </p>
                </div>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            )
          })}
        </div>
      </GlassCard>

      {/* Staff attendance snapshot */}
      <GlassCard className="mb-3.5">
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Staff Today · {totalStaff}</SectionLabel>
          <Link
            href="/attendance"
            className="text-[12px] font-medium no-underline"
            style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none" }}
          >
            View all →
          </Link>
        </div>
        {/* Progress bar breakdown */}
        <div className="flex h-2 rounded-full overflow-hidden mb-3 gap-0.5">
          {STAFF_SNAPSHOT.map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                width: `${(value / totalStaff) * 100}%`,
                background: color,
                borderRadius: 4,
              }}
              aria-label={`${label}: ${value}`}
            />
          ))}
        </div>
        {/* Legend */}
        <div className="grid grid-cols-4 gap-2">
          {STAFF_SNAPSHOT.map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p className="text-[18px] font-bold leading-tight" style={{ color }}>
                {value}
              </p>
              <p
                className="text-[10px] font-medium mt-0.5"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                {label}
              </p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Store / area performance */}
      <GlassCard className="mb-3.5">
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Area Performance</SectionLabel>
          <Link
            href="/operations"
            className="text-[12px] font-medium no-underline"
            style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none" }}
          >
            Details →
          </Link>
        </div>
        <div className="flex flex-col gap-3">
          {STORE_PERF.map(({ name, target, actual, trend }) => {
            const pct = (actual / 100) * 100
            const trendUp = trend.startsWith("+")
            return (
              <div key={name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className="text-[13px] font-medium"
                    style={{ color: "rgba(255,255,255,0.75)" }}
                  >
                    {name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[11px] font-semibold"
                      style={{
                        color: trendUp ? "rgba(48,209,88,0.9)" : "rgba(255,59,48,0.9)",
                      }}
                    >
                      {trend}
                    </span>
                    <span
                      className="text-[12px] font-bold"
                      style={{ color: "rgba(255,255,255,0.70)" }}
                    >
                      {actual}%
                    </span>
                  </div>
                </div>
                {/* Progress track */}
                <div
                  className="w-full h-1.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background:
                        actual >= target ? "rgba(48,209,88,0.70)" : "rgba(255,159,10,0.70)",
                    }}
                  />
                </div>
                {/* Target marker */}
                <div className="flex justify-end mt-0.5">
                  <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.22)" }}>
                    target {target}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </GlassCard>

      {/* Quick Actions */}
      <QuickActionsGrid actions={quickActions} />

      {/* Recent Activity — live client island */}
      <LiveActivityFeed initialEntries={INITIAL_ACTIVITY} companyId={session.companyId} />
    </div>
  )
}
