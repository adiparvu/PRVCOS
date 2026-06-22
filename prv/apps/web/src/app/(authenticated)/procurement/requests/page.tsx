import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { PurchaseRequestListClient } from "./PurchaseRequestListClient"

export const dynamic = "force-dynamic"

export function generateMetadata() {
  return { title: "Purchase Requests · Procurement · PRV" }
}

export default async function PurchaseRequestsPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  try {
    await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  return <PurchaseRequestListClient />
}
