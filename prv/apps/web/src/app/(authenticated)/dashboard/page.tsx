import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { DashboardRouter } from "./DashboardRouter"

export const dynamic = "force-dynamic"
export const metadata = { title: "Command" }

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

  return <DashboardRouter session={session} />
}
