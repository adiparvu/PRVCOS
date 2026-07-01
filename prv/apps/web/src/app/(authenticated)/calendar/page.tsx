import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { CalendarWorkspace } from "./CalendarWorkspace"

export const dynamic = "force-dynamic"
export const metadata = { title: "Calendar · PRV" }

export default async function CalendarPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  try {
    await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  return <CalendarWorkspace />
}
