import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { ApprovalListClient } from "./ApprovalListClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Aprobări · PRV" }

export default async function ApprovalsPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  try {
    await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  return <ApprovalListClient />
}
