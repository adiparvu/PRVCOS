import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"

export const dynamic = "force-dynamic"

// The web app root has no standalone landing — send visitors to their dashboard
// when signed in, or to the login screen otherwise, instead of a dead-end splash.
export default async function Home() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value

  if (sessionId) {
    const valid = await getSession(sessionId)
      .then(() => true)
      .catch(() => false)
    if (valid) redirect("/dashboard")
  }

  redirect("/auth/login")
}
