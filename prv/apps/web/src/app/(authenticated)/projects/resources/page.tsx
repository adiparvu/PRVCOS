import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { ResourceWorkloadClient } from "./ResourceWorkloadClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Resource Workload · PRV" }

export default async function ResourceWorkloadPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  try {
    await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  return <ResourceWorkloadClient />
}
