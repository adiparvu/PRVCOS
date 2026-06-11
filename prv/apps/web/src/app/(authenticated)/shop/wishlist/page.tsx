import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { WishlistClient } from "./WishlistClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Lista de dorințe · PRV" }

export default async function WishlistPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")
  try {
    await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }
  return <WishlistClient />
}
