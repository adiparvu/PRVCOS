import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { queryNotifications, queryNotificationCounts } from "@prv/db"
import { NotificationsClient } from "./NotificationsClient"
import type { NotificationFilter } from "@prv/db"

export const dynamic = "force-dynamic"
export const metadata = { title: "Notifications" }

const VALID_FILTERS = new Set<NotificationFilter>(["all", "alerts", "approvals", "inbox", "system"])

interface PageProps {
  searchParams: Promise<{ filter?: string }>
}

export default async function NotificationsPage({ searchParams }: PageProps) {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  let session
  try {
    session = await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  const { userId, companyId } = session
  const params = await searchParams
  const rawFilter = params.filter ?? "all"
  const filter: NotificationFilter = VALID_FILTERS.has(rawFilter as NotificationFilter)
    ? (rawFilter as NotificationFilter)
    : "all"

  const [initialNotifications, initialCounts] = await Promise.all([
    queryNotifications(userId, companyId, filter).catch(() => []),
    queryNotificationCounts(userId, companyId).catch(() => ({
      all: 0,
      alerts: 0,
      approvals: 0,
      inbox: 0,
      system: 0,
    })),
  ])

  return (
    <NotificationsClient
      initialFilter={filter}
      initialNotifications={initialNotifications.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      }))}
      initialCounts={initialCounts}
      userId={userId}
      companyId={companyId}
    />
  )
}
