import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { CrmAnalyticsClient } from "./CrmAnalyticsClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Sales Analytics · PRV" }

export default async function CrmAnalyticsPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  try {
    await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  return <CrmAnalyticsClient />
}
