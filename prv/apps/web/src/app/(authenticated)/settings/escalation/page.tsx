import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession, RoleSets, hasRole } from "@prv/auth"
import { EscalationPoliciesClient } from "./EscalationPoliciesClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Escaladare notificări · PRV" }

export default async function EscalationSettingsPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  let session
  try {
    session = await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  // Managing who receives escalations is authorization-sensitive; only
  // management+ may even view this page (mutations further require admin).
  if (!hasRole(session.role, RoleSets.management)) redirect("/settings")

  const canManage = hasRole(session.role, RoleSets.admin)
  return <EscalationPoliciesClient canManage={canManage} />
}
