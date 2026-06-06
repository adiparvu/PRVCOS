import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { queryCompanyKpis } from "@prv/db"
import { cacheMemo } from "@prv/cache"
import {
  GlassStatCard,
  GlassLineChart,
  GlassAlertBanner,
  GlassTimeline,
  type TimelineEntry,
} from "@prv/ui"
import { OnlineNowPanel } from "@/components/presence/OnlineNowPanel"
import { PinnedContactsRow } from "@/components/dashboard/PinnedContactsRow"
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting"

export const dynamic = "force-dynamic"
export const metadata = { title: "Command" }

const ROLE_LABELS: Record<string, string> = {
  group_ceo: "Group CEO",
  ceo: "CEO",
  co_ceo: "Co-CEO",
  system_administrator: "System Administrator",
  worker: "Worker",
  team_leader: "Team Leader",
  oms: "Operations Monitoring",
  operations_manager: "Operations Manager",
  department_head: "Department Head",
  hr_payroll: "HR & Payroll",
  project_worker: "Project Worker",
  project_team_leader: "Project Team Leader",
  project_oms: "Project OMS",
  project_operations_manager: "Project Operations Manager",
  project_director: "Project Director",
  seller: "Seller",
  store_manager: "Store Manager",
  shop_director: "Shop Director",
  app_support_specialist: "App Support",
  data_analyst: "Data Analyst",
  qa_tester: "QA Tester",
}

const QUICK_ACTIONS = [
  { label: "New Project", icon: "M12 5v14M5 12h14" },
  {
    label: "Add Employee",
    icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6M22 11h-6",
  },
  {
    label: "Create Invoice",
    icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M16 13H8M16 17H8M10 9H8",
  },
  {
    label: "New Order",
    icon: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0",
  },
  { label: "Upload Doc", icon: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" },
  { label: "View Reports", icon: "M3 3v18h18M18 17V9M13 17V5M8 17v-3" },
]

// ── Placeholder data ────────────────────────────────────────────────────────
// These power the new dashboard regions until backend queries exist for them.
// Live KPIs (revenue / projects / workforce / alerts) come from queryCompanyKpis.

const REVENUE_SERIES = [320, 348, 360, 402, 438, 482]
const REVENUE_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]

const SPARK = {
  revenue: [30, 34, 32, 40, 38, 44, 48],
  profit: [26, 24, 28, 26, 30, 32, 34],
  projects: [24, 22, 24, 20, 21, 26, 28],
  workforce: [20, 20, 18, 19, 17, 18, 16],
}

const ACTIVITY: TimelineEntry[] = [
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

const QUOTE = {
  text: "Simplicity is the ultimate sophistication.",
  author: "Leonardo da Vinci",
}

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-[18px] p-4 relative ${className}`}
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
      }}
    >
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mb-3">
      {children}
    </p>
  )
}

function formatCurrency(raw: string): string {
  const n = parseFloat(raw)
  if (isNaN(n)) return "0 RON"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M RON`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K RON`
  return `${n.toLocaleString("ro-RO")} RON`
}

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  let session
  try {
    session = await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  const roleLabel = ROLE_LABELS[session.role] ?? session.role
  const periodKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`

  let kpis
  try {
    // Cache is per-company (not per-user) — all users share the same company snapshot
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

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-white/35 text-[13px] font-medium mb-0.5">PRV</p>
          <h1 className="text-white/90 text-[26px] font-semibold tracking-tight leading-tight">
            Command
          </h1>
        </div>
        <div
          className="px-3 py-1.5 rounded-[10px] text-[12px] font-medium text-white/60"
          style={{
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
          }}
        >
          {roleLabel}
        </div>
      </div>

      {/* Greeting + Weather */}
      <DashboardGreeting tasksToday={6} />

      {/* AI Briefing — directly below the greeting */}
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
            <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <div>
          <p className="text-[12px] font-bold text-white/90 mb-0.5">AI BRIEFING</p>
          <p className="text-[13px] text-white/65 leading-relaxed">
            Revenue is tracking <span className="text-white/90 font-semibold">+12% MoM</span>. Cluj
            is your best-margin store (39%). 2 projects risk slipping this week — review staffing.
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

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 mb-3.5">
        <GlassStatCard
          label="Revenue"
          value={kpis ? formatCurrency(kpis.revenue) : "—"}
          trend={{ direction: "up", value: "12.4%" }}
          sparkline={SPARK.revenue}
        />
        <GlassStatCard
          label="Profit"
          value="€138K"
          trend={{ direction: "up", value: "8.1%" }}
          sparkline={SPARK.profit}
        />
        <GlassStatCard
          label="Active Projects"
          value={kpis ? String(kpis.activeProjects) : "—"}
          trend={{ direction: "up", value: "6" }}
          sparkline={SPARK.projects}
        />
        <GlassStatCard
          label="Workforce"
          value={kpis ? String(kpis.workforce) : "—"}
          trend={{ direction: "flat", value: "312 online" }}
          sparkline={SPARK.workforce}
        />
      </div>

      {/* Revenue chart */}
      <GlassCard className="mb-3.5">
        <SectionLabel>Revenue · last 6 months</SectionLabel>
        <GlassLineChart
          series={[{ label: "Revenue", data: REVENUE_SERIES }]}
          labels={REVENUE_LABELS}
          height={140}
        />
      </GlassCard>

      {/* Online Now — live presence panel (client component) */}
      <div className="mb-3.5">
        <OnlineNowPanel companyId={session.companyId} />
      </div>

      {/* Pinned Contacts — quick access row (client component) */}
      <PinnedContactsRow />

      {/* Quick Actions */}
      <GlassCard className="mb-3.5">
        <SectionLabel>Quick Actions</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_ACTIONS.map(({ label, icon }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1.5 h-[68px] rounded-[12px] justify-center cursor-default"
              style={{
                background: "var(--prv-g2)",
                border: "1px solid var(--prv-border-subtle)",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white/45"
              >
                <path d={icon} />
              </svg>
              <span className="text-[11px] font-medium text-white/45 text-center leading-tight px-1">
                {label}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Quote of the Day */}
      <GlassCard className="mb-3.5">
        <SectionLabel>Quote of the day</SectionLabel>
        <p className="text-[15px] leading-relaxed text-white/90">“{QUOTE.text}”</p>
        <p className="text-[12px] text-white/35 mt-2">— {QUOTE.author}</p>
      </GlassCard>

      {/* Recent Activity */}
      <GlassCard>
        <SectionLabel>Recent Activity</SectionLabel>
        <GlassTimeline entries={ACTIVITY} compact />
      </GlassCard>
    </div>
  )
}
