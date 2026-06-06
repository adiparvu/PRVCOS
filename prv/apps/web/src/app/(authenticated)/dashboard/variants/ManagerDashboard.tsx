import { cacheMemo } from "@prv/cache"
import { queryManagerKpis } from "@prv/db"
import { GlassStatCard, GlassAlertBanner, GlassTimeline, type TimelineEntry } from "@prv/ui"
import type { PRVSession } from "@prv/auth"
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting"
import { resolveQuickActions } from "@/lib/quick-actions"
import { GlassCard, SectionLabel, formatCurrency, QuickActionsGrid, InlineAlert } from "../_shared"

const SPARK = {
  revenue: [28, 32, 30, 36, 34, 40, 44],
  workforce: [18, 18, 17, 18, 16, 17, 17],
  projects: [8, 9, 10, 10, 11, 12, 12],
  tasks: [22, 20, 18, 16, 15, 14, 13],
}

const ACTIVITY: TimelineEntry[] = [
  {
    id: "1",
    type: "info",
    title: "New leave request submitted",
    description: "Ion Dima",
    timestamp: "12 minutes ago",
  },
  {
    id: "2",
    type: "warning",
    title: "Task overdue — Inventory count",
    description: "Section B",
    timestamp: "1 hour ago",
  },
  {
    id: "3",
    type: "success",
    title: "Daily target reached",
    description: "Cluj · Main",
    timestamp: "3 hours ago",
  },
]

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

      {/* Alerts */}
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

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 mb-3.5">
        <GlassStatCard
          label="Revenue MTD"
          value={kpis ? formatCurrency(kpis.revenue) : "—"}
          trend={{ direction: "up", value: "vs last month" }}
          sparkline={SPARK.revenue}
        />
        <GlassStatCard
          label="Workforce"
          value={kpis ? String(kpis.workforce) : "—"}
          trend={{ direction: "flat", value: "active" }}
          sparkline={SPARK.workforce}
        />
        <GlassStatCard
          label="Active Projects"
          value={kpis ? String(kpis.activeProjects) : "—"}
          trend={{ direction: "up", value: "on track" }}
          sparkline={SPARK.projects}
        />
        <GlassStatCard
          label="Open Tasks"
          value="13"
          trend={{ direction: "down", value: "9 done today" }}
          sparkline={SPARK.tasks}
        />
      </div>

      {/* Quick Actions */}
      <QuickActionsGrid actions={quickActions} />

      {/* Recent Activity */}
      <GlassCard>
        <SectionLabel>Recent Activity</SectionLabel>
        <GlassTimeline entries={ACTIVITY} compact />
      </GlassCard>
    </div>
  )
}
