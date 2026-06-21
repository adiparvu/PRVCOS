import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { AICostClient } from "./AICostClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "AI Usage · Intelligence" }

export default async function AICostPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  let session
  try {
    session = await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  return <AICostClient role={session.role} />
}
