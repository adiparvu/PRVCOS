import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { QuoteListClient } from "./QuoteListClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Oferte" }

export default async function QuotesPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  try {
    await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  return <QuoteListClient />
}
