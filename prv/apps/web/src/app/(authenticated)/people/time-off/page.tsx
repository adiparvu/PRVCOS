import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { TimeOffClient } from "./TimeOffClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Time-Off Approvals · People" }

export default async function TimeOffPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  let session
  try {
    session = await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  return <TimeOffClient role={session.role} />
}
