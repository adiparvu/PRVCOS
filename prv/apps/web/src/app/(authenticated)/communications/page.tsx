import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { CommunicationsClient } from "./CommunicationsClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Communications" }

export default async function CommunicationsPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  try {
    const session = await getSession(sessionId)
    return <CommunicationsClient userId={session.userId} companyId={session.companyId} />
  } catch {
    redirect("/auth/login")
  }
}
