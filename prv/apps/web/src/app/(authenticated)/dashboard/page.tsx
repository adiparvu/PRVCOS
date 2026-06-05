import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { db } from "@prv/db"
import { invoices, projects, companyMemberships, notifications } from "@prv/db/schema"
import { cacheMemo } from "@prv/cache"
import { sql, eq, and, gte, lt, isNull, inArray } from "drizzle-orm"

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
        className={`text-[28px] font-semibold leading-none tracking-tight ${highlight ? "text-white" : "text-white/90"}`}
      >
        {value}
      </p>
      {sublabel && <p className="text-[12px] text-white/35 mt-1.5">{sublabel}</p>}
    </GlassCard>
  )
}

async function fetchKpis(companyId: string, userId: string) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  return cacheMemo(
    "dashboard_kpis",
    `${companyId}:${userId}:${periodKey}`,
    async () => {
      const [revenueRow, projectsRow, workforceRow, alertsRow] = await Promise.all([
        db
          .select({ total: sql<string>`COALESCE(SUM(${invoices.total}), 0)::text` })
          .from(invoices)
          .where(
            and(
              eq(invoices.companyId, companyId),
              eq(invoices.status, "paid"),
              gte(invoices.paidAt, startOfMonth),
              lt(invoices.paidAt, startOfNextMonth)
            )
          ),
        db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(projects)
          .where(
            and(
              eq(projects.companyId, companyId),
              eq(projects.status, "active"),
              eq(projects.isActive, true),
              isNull(projects.deletedAt)
            )
          ),
        db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(companyMemberships)
          .where(
            and(
              eq(companyMemberships.companyId, companyId),
              eq(companyMemberships.status, "ACTIVE")
            )
          ),
        db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(notifications)
          .where(
            and(
              eq(notifications.companyId, companyId),
              eq(notifications.userId, userId),
              eq(notifications.isRead, false),
              eq(notifications.isDismissed, false),
              inArray(notifications.type, ["error", "warning", "action_required"])
            )
          ),
      ])

      return {
        revenue: revenueRow[0]?.total ?? "0",
        activeProjects: projectsRow[0]?.count ?? 0,
        workforce: workforceRow[0]?.count ?? 0,
        alerts: alertsRow[0]?.count ?? 0,
        periodKey,
      }
    },
    { ttl: 60 }
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

  let kpis
  try {
    kpis = await fetchKpis(session.companyId, session.userId)
  } catch {
    kpis = null
  }

  const now = new Date()
  const monthName = now.toLocaleString("en-US", { month: "long" })

  return (
    <div className="px-4 pt-14 pb-4 max-w-2xl mx-auto">
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
      <div className="grid grid-cols-2 gap-3 mb-6">
        <KpiCard
          label="Revenue"
          value={kpis ? formatCurrency(kpis.revenue) : "—"}
          sublabel={kpis ? `${monthName} · paid invoices` : "Loading…"}
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

      {/* Quick Actions */}
      <GlassCard className="mb-6">
        <p className="text-[11px] font-medium text-white/35 uppercase tracking-widest mb-4">
          Quick Actions
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "New Project" },
            { label: "Add Employee" },
            { label: "Create Invoice" },
            { label: "New Order" },
            { label: "Upload Doc" },
            { label: "View Reports" },
          ].map(({ label }) => (
            <button
              key={label}
              disabled
              className="h-10 rounded-[12px] text-[12px] font-medium text-white/50 transition-all duration-150 disabled:cursor-default"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Recent Activity placeholder */}
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
                  className="h-2.5 rounded-full w-3/4"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                />
                <div
                  className="h-2 rounded-full w-1/2"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-white/20 text-[12px] mt-4">
          Activity feed — coming in a future sprint
        </p>
      </GlassCard>
    </div>
  )
}
