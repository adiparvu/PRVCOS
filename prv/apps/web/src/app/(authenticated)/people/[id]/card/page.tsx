import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { CardEditorClient } from "./CardEditorClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Business Card" }

interface Props {
  params: Promise<{ id: string }>
}

export default async function CardEditorPage({ params }: Props) {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  let session
  try {
    session = await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  const { id } = await params

  // Only own card is editable here; viewing others' cards is via the ContactDetailSheet
  if (id !== session.userId) redirect(`/people/${id}`)

  return <CardEditorClient />
}
