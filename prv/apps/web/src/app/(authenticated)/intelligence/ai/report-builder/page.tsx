import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { ReportBuilderClient } from "./ReportBuilderClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Report Builder · AI" }

export default async function ReportBuilderPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  let session
  try {
    session = await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  return <ReportBuilderClient role={session.role} />
}
