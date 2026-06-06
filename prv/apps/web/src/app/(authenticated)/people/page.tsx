import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { PeopleViews } from "./components/PeopleViews"

export const dynamic = "force-dynamic"
export const metadata = { title: "People" }

interface Props {
  searchParams: Promise<{ status?: string }>
}

export default async function PeoplePage({ searchParams }: Props) {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  let session
  try {
    session = await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  const { status } = await searchParams

  return (
    <div className="pt-14 max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-4 mb-4">
        <p className="text-white/35 text-[13px] font-medium mb-0.5">PRV</p>
        <h1 className="text-white/90 text-[26px] font-semibold tracking-tight">People</h1>
      </div>

      <PeopleViews companyId={session.companyId} initialStatusFilter={status ?? ""} />
    </div>
  )
}
