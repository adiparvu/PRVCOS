import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { AttendanceDetailClient } from "./AttendanceDetailClient"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  return { title: `${id.toUpperCase()} · Prezență · PRV` }
}

export default async function AttendanceDetailPage({ params }: Props) {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  try {
    await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  const { id } = await params
  return <AttendanceDetailClient id={id} />
}
