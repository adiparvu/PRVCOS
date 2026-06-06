import { cacheMemo } from "@prv/cache"
import { queryManagerKpis } from "@prv/db"
import { GlassAlertBanner } from "@prv/ui"
import type { PRVSession } from "@prv/auth"
import type { ActivityEventPayload } from "@prv/cache"
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting"
import { resolveQuickActions } from "@/lib/quick-actions"
import { GlassCard, SectionLabel, QuickActionsGrid, InlineAlert } from "../_shared"
import { LiveKpiGrid } from "../islands/LiveKpiGrid"
import { LiveActivityFeed } from "../islands/LiveActivityFeed"

const INITIAL_ACTIVITY: ActivityEventPayload[] = [
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

  const initialKpis = {
    revenue: kpis?.revenue ?? "0",
    workforce: kpis?.workforce ?? 0,
    activeProjects: kpis?.activeProjects ?? 0,
    alerts: kpis?.alerts ?? 0,
    pendingApprovals: kpis?.pendingApprovals ?? 0,
  }

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

      {/* KPI grid — live client island */}
      <LiveKpiGrid initial={initialKpis} companyId={session.companyId} variant="manager" />

      {/* Quick Actions */}
      <QuickActionsGrid actions={quickActions} />

      {/* Recent Activity — live client island */}
      <LiveActivityFeed initialEntries={INITIAL_ACTIVITY} companyId={session.companyId} />
    </div>
  )
}
