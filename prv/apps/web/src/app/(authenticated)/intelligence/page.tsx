import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import IntelligenceListClient from "./IntelligenceListClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Inteligență · PRV" }

export default async function IntelligencePage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  try {
    await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  return <IntelligenceListClient />
}
