import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import OperationsListClient from "./OperationsListClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Operations · PRV" }

export default async function OperationsPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  try {
    await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  return <OperationsListClient />
}
