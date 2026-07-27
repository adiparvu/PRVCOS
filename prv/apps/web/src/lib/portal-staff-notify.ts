import { db } from "@prv/db"
import { clients, notifications } from "@prv/db/schema"
import { eq } from "drizzle-orm"

// Staff-side notifications for CLIENT portal actions (quote decision, contract
// signature, document upload). Recipients are always explicit, never guessed:
// either the entity's creator, or the client's assigned account manager —
// no assignment configured means no notification. Callers treat this as
// fail-open: a notification hiccup must never fail the client's action.

interface StaffNotification {
  userId: string
  companyId: string
  title: string
  body: string
  entityType: string
  entityId: string
  actionUrl: string
}

export async function notifyStaffUser(n: StaffNotification): Promise<void> {
  await db.insert(notifications).values({
    userId: n.userId,
    companyId: n.companyId,
    type: "info",
    channel: "in_app",
    title: n.title.slice(0, 500),
    body: n.body,
    entityType: n.entityType,
    entityId: n.entityId,
    actionUrl: n.actionUrl,
    deliveredAt: new Date(),
  })
}

/** Resolve the client's account manager; null when none is assigned. */
export async function resolveAccountManager(
  companyId: string,
  clientId: string
): Promise<string | null> {
  const [row] = await db
    .select({ assignedUserId: clients.assignedUserId })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1)
  return row && row.assignedUserId ? row.assignedUserId : null
}

export async function notifyAccountManager(
  companyId: string,
  clientId: string,
  n: Omit<StaffNotification, "userId" | "companyId">
): Promise<boolean> {
  const managerId = await resolveAccountManager(companyId, clientId)
  if (!managerId) return false
  await notifyStaffUser({ ...n, userId: managerId, companyId })
  return true
}
