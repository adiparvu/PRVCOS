import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { DocumentsListClient } from "./DocumentsListClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Documente · PRV" }

export default async function DocumentsPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  try {
    await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  return <DocumentsListClient />
}
