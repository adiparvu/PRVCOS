import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { ShopOrdersClient } from "./ShopOrdersClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Comendays mele · Shop · PRV" }

export default async function ShopOrdersPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")
  try {
    await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }
  return <ShopOrdersClient />
}
