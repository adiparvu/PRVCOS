import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { DocumentBuilderClient } from "./DocumentBuilderClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Document Nou · Documente · PRV" }

export default async function NewDocumentPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")
  try {
    await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }
  return <DocumentBuilderClient />
}
