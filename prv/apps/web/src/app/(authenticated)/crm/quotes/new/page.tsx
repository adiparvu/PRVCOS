import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { QuoteBuilderClient } from "./QuoteBuilderClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "New Quote · CRM" }

export default async function NewQuotePage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  try {
    await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  return <QuoteBuilderClient />
}
