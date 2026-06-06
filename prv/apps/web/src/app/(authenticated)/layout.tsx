import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { FloatingTabBar } from "./floating-tab-bar"
import { AppearanceButton } from "./appearance-button"

export const dynamic = "force-dynamic"

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value

  if (!sessionId) {
    redirect("/auth/login")
  }

  let session
  try {
    session = await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Ambient background — subtle radial glow at top */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 40% at 50% -10%, var(--prv-border-subtle) 0%, transparent 100%)",
        }}
      />

      {/* Main content — padded bottom for floating tab bar */}
      <main className="relative z-10 min-h-screen pb-32">{children}</main>

      {/* Appearance settings toggle — fixed top-right */}
      <AppearanceButton />

      {/* Floating Tab Bar — fixed at bottom, above content */}
      <FloatingTabBar role={session.role} />
    </div>
  )
}
