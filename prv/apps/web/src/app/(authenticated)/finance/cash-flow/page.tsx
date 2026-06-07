import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { CashFlowClient } from "./CashFlowClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Cash Flow · Finanțe" }

export default async function CashFlowPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  try {
    await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  return <CashFlowClient />
}
