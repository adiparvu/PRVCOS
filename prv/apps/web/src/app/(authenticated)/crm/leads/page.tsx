import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { LeadPipelineClient } from "./LeadPipelineClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Lead Pipeline · CRM" }

export default async function LeadPipelinePage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  try {
    await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  return <LeadPipelineClient />
}
