import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { FloatingTabBar } from "./floating-tab-bar"
import { FloatingSearchBar } from "./floating-search-bar"
import { DynamicIslandBar } from "./dynamic-island-bar"
import { AppearanceButton } from "./appearance-button"
import { SheetStackClient } from "./sheet-stack-client"
import { CommandPaletteClient } from "./command-palette-client"
import { QueryProvider } from "./query-provider"

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
            "radial-gradient(ellipse 100% 40% at 50% -10%, rgba(255,255,255,0.03) 0%, transparent 100%)",
        }}
      />

      {/* Dynamic Island — fixed top, role-aware live context */}
      <DynamicIslandBar role={session.role} userId={session.userId} companyId={session.companyId} />

      {/* Floating Search Bar — fixed below DI, pill-shaped glass */}
      <FloatingSearchBar role={session.role} />

      {/* Main content — padded top for search bar, bottom for tab bar */}
      <QueryProvider>
        <CommandPaletteClient role={session.role}>
          <SheetStackClient>
            <main className="relative z-10 min-h-screen pt-24 pb-32">{children}</main>
          </SheetStackClient>
        </CommandPaletteClient>
      </QueryProvider>

      {/* Appearance settings toggle — fixed top-right */}
      <AppearanceButton />

      {/* Floating Tab Bar — fixed at bottom */}
      <FloatingTabBar role={session.role} userId={session.userId} companyId={session.companyId} />
    </div>
  )
}
