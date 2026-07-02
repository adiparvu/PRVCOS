import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { PerformanceClient } from "./PerformanceClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Team Performance · PRV" }

export default async function PerformancePage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  try {
    await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  return <PerformanceClient />
}
