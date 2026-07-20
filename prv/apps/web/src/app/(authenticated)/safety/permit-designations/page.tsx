import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { PermitDesignationsClient } from "./PermitDesignationsClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Desemnări permise · Safety · PRV" }

export default async function PermitDesignationsPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")
  try {
    await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }
  return <PermitDesignationsClient />
}
