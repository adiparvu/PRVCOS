import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { ToolDetailClient } from "./ToolDetailClient"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  return { title: `${id.toUpperCase()} · Scule · PRV` }
}

export default async function ToolDetailPage({ params }: Props) {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  try {
    await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  const { id } = await params
  return <ToolDetailClient id={id} />
}
