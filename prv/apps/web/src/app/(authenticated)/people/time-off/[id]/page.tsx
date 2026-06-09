import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { TimeOffDetailClient } from "./TimeOffDetailClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Time-Off Request · People" }

interface Props {
  params: Promise<{ id: string }>
}

export default async function TimeOffDetailPage({ params }: Props) {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  try {
    await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  const { id } = await params
  return <TimeOffDetailClient id={id} />
}
