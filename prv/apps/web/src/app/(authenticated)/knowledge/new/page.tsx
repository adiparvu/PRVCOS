import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { KnowledgeArticleBuilderClient } from "./KnowledgeArticleBuilderClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Articol Nou · Bază de cunoștințe · PRV" }

export default async function NewKnowledgeArticlePage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")
  try {
    await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }
  return <KnowledgeArticleBuilderClient />
}
