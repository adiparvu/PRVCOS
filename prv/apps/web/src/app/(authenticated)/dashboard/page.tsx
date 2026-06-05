import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { queryCompanyKpis } from "@prv/db"
import { cacheMemo } from "@prv/cache"
import { OnlineNowPanel } from "@/components/presence/OnlineNowPanel"
import { PinnedContactsRow } from "@/components/dashboard/PinnedContactsRow"

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

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-[20px] p-5 ${className}`}
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
      }}
    >
      {children}
    </div>
  )
}

function KpiCard({
  label,
  value,
  sublabel,
  highlight = false,
}: {
  label: string
  value: string
  sublabel?: string
  highlight?: boolean
}) {
  return (
    <GlassCard>
      <p className="text-[11px] font-medium text-white/35 uppercase tracking-widest mb-2">
        {label}
      </p>
      <p
        className={`text-[28px] font-semibold leading-none tracking-tight ${
          highlight ? "text-white" : "text-white/90"
        }`}
      >
        {value}
      </p>
      {sublabel && <p className="text-[12px] text-white/35 mt-1.5">{sublabel}</p>}
    </GlassCard>
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
  const monthName = new Date().toLocaleString("en-US", { month: "long" })

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

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-white/35 text-[13px] font-medium mb-0.5">PRV</p>
          <h1 className="text-white/90 text-[26px] font-semibold tracking-tight leading-tight">
            Command Center
          </h1>
        </div>
        <div
          className="px-3 py-1.5 rounded-[10px] text-[12px] font-medium text-white/60"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          {roleLabel}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <KpiCard
          label="Revenue"
          value={kpis ? formatCurrency(kpis.revenue) : "—"}
          sublabel={kpis ? `${monthName} · paid invoices` : undefined}
        />
        <KpiCard
          label="Active Projects"
          value={kpis ? String(kpis.activeProjects) : "—"}
          sublabel="Across all teams"
        />
        <KpiCard
          label="Workforce"
          value={kpis ? String(kpis.workforce) : "—"}
          sublabel="Active members"
        />
        <KpiCard
          label="Alerts"
          value={kpis ? String(kpis.alerts) : "—"}
          sublabel="Unread · critical"
          highlight={(kpis?.alerts ?? 0) > 0}
        />
      </div>

      {/* Online Now — live presence panel (client component) */}
      <div className="mb-5">
        <OnlineNowPanel companyId={session.companyId} />
      </div>

      {/* Pinned Contacts — quick access row (client component) */}
      <PinnedContactsRow />

      {/* Quick Actions */}
      <GlassCard className="mb-5">
        <p className="text-[11px] font-medium text-white/35 uppercase tracking-widest mb-4">
          Quick Actions
        </p>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_ACTIONS.map(({ label, icon }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1.5 h-[68px] rounded-[12px] justify-center cursor-default"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
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
                strokeLinejoin="linejoin"
                className="text-white/30"
              >
                <path d={icon} />
              </svg>
              <span className="text-[11px] font-medium text-white/30 text-center leading-tight px-1">
                {label}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Recent Activity skeleton */}
      <GlassCard>
        <p className="text-[11px] font-medium text-white/35 uppercase tracking-widest mb-4">
          Recent Activity
        </p>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-[10px] shrink-0"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />
              <div className="flex-1 space-y-1.5">
                <div
                  className="h-2.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.08)", width: `${60 + i * 10}%` }}
                />
                <div
                  className="h-2 rounded-full w-1/2"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
