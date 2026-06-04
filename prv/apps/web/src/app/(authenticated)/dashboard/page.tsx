import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"

export const dynamic = "force-dynamic"
export const metadata = { title: "Command" }

// Role display labels
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

function KpiCard({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <GlassCard>
      <p className="text-[11px] font-medium text-white/35 uppercase tracking-widest mb-2">
        {label}
      </p>
      <p className="text-[28px] font-semibold text-white/90 leading-none tracking-tight">{value}</p>
      {sublabel && <p className="text-[12px] text-white/35 mt-1.5">{sublabel}</p>}
    </GlassCard>
  )
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
        <KpiCard label="Revenue" value="—" sublabel="This month" />
        <KpiCard label="Active Projects" value="—" sublabel="Across all teams" />
        <KpiCard label="Workforce" value="—" sublabel="Active employees" />
        <KpiCard label="Alerts" value="—" sublabel="Requires attention" />
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
