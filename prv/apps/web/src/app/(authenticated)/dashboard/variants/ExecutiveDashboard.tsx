import { cacheMemo } from "@prv/cache"
import { queryCompanyKpis } from "@prv/db"
import { GlassAlertBanner } from "@prv/ui"
import type { PRVSession } from "@prv/auth"
import type { ActivityEventPayload } from "@prv/cache"
import { OnlineNowPanel } from "@/components/presence/OnlineNowPanel"
import { PinnedContactsRow } from "@/components/dashboard/PinnedContactsRow"
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting"
import { resolveQuickActions } from "@/lib/quick-actions"
import { GlassCard, SectionLabel, QuickActionsGrid } from "../_shared"
import { LiveKpiGrid } from "../islands/LiveKpiGrid"
import { LiveActivityFeed } from "../islands/LiveActivityFeed"

const REVENUE_SERIES = [320, 348, 360, 402, 438, 482]
const REVENUE_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]

const SPARK = {
  revenue: [30, 34, 32, 40, 44, 48],
}

const INITIAL_ACTIVITY: ActivityEventPayload[] = [
  {
    id: "1",
    type: "success",
    title: "Invoice #1042 paid · €298",
    description: "Finance",
    timestamp: "2 minutes ago",
  },
  {
    id: "2",
    type: "info",
    title: 'New project "Cluj Kitchen" created',
    description: "Andrei P.",
    timestamp: "18 minutes ago",
  },
  {
    id: "3",
    type: "warning",
    title: "Leave request awaiting approval",
    description: "Maria I.",
    timestamp: "1 hour ago",
  },
]

interface Props {
  session: PRVSession
}

export async function ExecutiveDashboard({ session }: Props) {
  const periodKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`

  let kpis
  try {
    kpis = await cacheMemo(
      "dashboard_kpis",
      `${session.companyId}:${periodKey}`,
      () => queryCompanyKpis(session.companyId, session.userId),
      { ttl: 60 }
    )
  } catch {
    kpis = null
  }

  const alertCount = kpis?.alerts ?? 0
  const quickActions = resolveQuickActions(session.role)

  const initialKpis = {
    revenue: kpis?.revenue ?? "0",
    workforce: kpis?.workforce ?? 0,
    activeProjects: kpis?.activeProjects ?? 0,
    alerts: alertCount,
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
          Executive
        </div>
      </div>

      {/* Greeting */}
      <DashboardGreeting />

      {/* AI Briefing */}
      <div
        className="flex gap-3 p-4 rounded-[16px] relative overflow-hidden mb-3.5"
        style={{
          background:
            "radial-gradient(circle at 0% 0%, rgba(10,132,255,0.14), transparent 60%), var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
        }}
      >
        <div
          className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg,#0A84FF,#5E5CE6)" }}
          aria-hidden="true"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M17.7 17.7l2.1 2.1M2 12h4M18 12h4" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <div>
          <p className="text-[12px] font-bold mb-0.5" style={{ color: "var(--prv-text-1)" }}>
            AI BRIEFING
          </p>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--prv-text-2)" }}>
            Revenue is tracking{" "}
            <span className="font-semibold" style={{ color: "var(--prv-text-1)" }}>
              +12% MoM
            </span>
            . Cluj is your best-margin store (39%). 2 projects risk slipping this week — review
            staffing.
          </p>
        </div>
      </div>

      {/* Critical alerts */}
      {alertCount > 0 && (
        <div className="mb-3.5">
          <GlassAlertBanner
            type="error"
            title={`${alertCount} critical alert${alertCount === 1 ? "" : "s"}`}
            description="Low stock · overdue invoice · failed payment"
          />
        </div>
      )}

      {/* KPI grid — live client island */}
      <LiveKpiGrid initial={initialKpis} companyId={session.companyId} variant="executive" />

      {/* Revenue chart */}
      <GlassCard className="mb-3.5">
        <SectionLabel>Revenue · last 6 months</SectionLabel>
        <div className="flex items-end gap-1 h-[88px]" aria-label="Revenue sparkline">
          {REVENUE_SERIES.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-[3px]"
                style={{
                  height: `${Math.round((v / Math.max(...REVENUE_SERIES)) * 72)}px`,
                  background:
                    i === REVENUE_SERIES.length - 1
                      ? "rgba(255,255,255,0.55)"
                      : "rgba(255,255,255,0.14)",
                }}
              />
              <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                {REVENUE_LABELS[i]}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Online Now */}
      <div className="mb-3.5">
        <OnlineNowPanel companyId={session.companyId} />
      </div>

      {/* Pinned Contacts */}
      <PinnedContactsRow />

      {/* Quick Actions */}
      <QuickActionsGrid actions={quickActions} />

      {/* Recent Activity — live client island */}
      <LiveActivityFeed initialEntries={INITIAL_ACTIVITY} companyId={session.companyId} />
    </div>
  )
}
