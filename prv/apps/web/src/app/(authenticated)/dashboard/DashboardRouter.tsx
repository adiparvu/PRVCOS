import type { PRVSession } from "@prv/auth"
import { ExecutiveDashboard } from "./variants/ExecutiveDashboard"
import { ManagerDashboard } from "./variants/ManagerDashboard"
import { WorkerDashboard } from "./variants/WorkerDashboard"
import { SpecialistDashboard } from "./variants/SpecialistDashboard"

// ── Role → dashboard variant ──────────────────────────────────────────────────

const EXECUTIVE_ROLES = new Set<PRVSession["role"]>(["group_ceo", "ceo", "co_ceo"])

const MANAGER_ROLES = new Set<PRVSession["role"]>([
  "operations_manager",
  "project_director",
  "shop_director",
  "store_manager",
  "project_operations_manager",
  "oms",
  "project_oms",
  "department_head",
  "hr_payroll",
])

const SPECIALIST_ROLES = new Set<PRVSession["role"]>([
  "data_analyst",
  "qa_tester",
  "app_support_specialist",
  "system_administrator",
])

// Worker roles are the remainder:
// worker, team_leader, project_worker, project_team_leader, seller

interface Props {
  session: PRVSession
}

export function DashboardRouter({ session }: Props) {
  if (EXECUTIVE_ROLES.has(session.role)) {
    return <ExecutiveDashboard session={session} />
  }
  if (MANAGER_ROLES.has(session.role)) {
    return <ManagerDashboard session={session} />
  }
  if (SPECIALIST_ROLES.has(session.role)) {
    return <SpecialistDashboard session={session} />
  }
  // Default: worker / team_leader / project_worker / project_team_leader / seller
  return <WorkerDashboard session={session} />
}
