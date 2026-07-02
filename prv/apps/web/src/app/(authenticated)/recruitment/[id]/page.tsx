import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { PipelineClient } from "./PipelineClient"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  return { title: `Pipeline · Req ${id} · PRV` }
}

export default async function PipelinePage({ params }: Props) {
  const { id } = await params

  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  try {
    await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  return <PipelineClient requisitionId={id} />
}
