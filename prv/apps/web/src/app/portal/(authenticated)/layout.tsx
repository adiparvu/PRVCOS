import { redirect } from "next/navigation"
import { getPortalSession } from "@/lib/portal-auth"
import type { PortalSessionContext } from "@/lib/portal-auth"
import { PortalNav } from "./portal-nav"

export const dynamic = "force-dynamic"

export default async function PortalAuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getPortalSession()
  if (!session) {
    redirect("/portal/login")
  }

  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <PortalNav session={session} />
      <main className="flex-1 px-4 pb-32 pt-20 sm:px-6">{children}</main>
    </div>
  )
}
