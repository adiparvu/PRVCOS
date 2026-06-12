import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { KnowledgeListClient } from "./KnowledgeListClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Knowledge · PRV" }

export default async function KnowledgePage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  try {
    await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  return <KnowledgeListClient />
}
