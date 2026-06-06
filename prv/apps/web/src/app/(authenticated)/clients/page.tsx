import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { ClientsWorkspace } from "./ClientsWorkspace"

export const dynamic = "force-dynamic"
export const metadata = { title: "Client Portal" }

export default async function ClientsPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  try {
    await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  return (
    <div className="pt-14 max-w-2xl mx-auto">
      <ClientsWorkspace />
    </div>
  )
}
