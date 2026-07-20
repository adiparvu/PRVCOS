import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession, RoleSets, hasRole } from "@prv/auth"
import { CriticalRoutesClient } from "./CriticalRoutesClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Rutare alerte critice · PRV" }

export default async function CriticalRoutesPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  let session
  try {
    session = await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  if (!hasRole(session.role, RoleSets.management)) redirect("/settings")
  return <CriticalRoutesClient canManage={hasRole(session.role, RoleSets.admin)} />
}
