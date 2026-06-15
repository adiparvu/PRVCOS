import { db } from "../client"
import { notifications } from "../schema/notifications"
import { approvalRequests } from "../schema/approvals"
import { purchaseOrders } from "../schema/procurement"
import { leaveRequests } from "../schema/workforce"
import { eq, and, desc, lt, or, inArray, sql } from "drizzle-orm"
import type { SQL } from "drizzle-orm"

export type NotificationFilter = "all" | "alerts" | "approvals" | "inbox" | "system"
export type NotificationActionKind = "approve" | "decline"

export interface NotificationRow {
  id: string
  type: "info" | "warning" | "error" | "success" | "action_required"
  title: string
  body: string | null
  actionUrl: string | null
  entityType: string | null
  entityId: string | null
  isRead: boolean
  isDismissed: boolean
  createdAt: Date
  metadata: Record<string, unknown>
}

export interface NotificationCounts {
  all: number
  alerts: number
  approvals: number
  inbox: number
  system: number
}

function filterClause(filter: NotificationFilter): SQL<unknown> | undefined {
  switch (filter) {
    case "alerts":
      return or(eq(notifications.type, "error"), eq(notifications.type, "warning"))
    case "approvals":
      return eq(notifications.type, "action_required")
    case "inbox":
      return or(eq(notifications.type, "info"), eq(notifications.type, "success"))
    case "system":
      return eq(notifications.entityType, "system")
    default:
      return undefined
  }
}

export async function queryNotifications(
  userId: string,
  companyId: string,
  filter: NotificationFilter = "all",
  cursor?: string,
  limit = 30
): Promise<NotificationRow[]> {
  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      actionUrl: notifications.actionUrl,
      entityType: notifications.entityType,
      entityId: notifications.entityId,
      isRead: notifications.isRead,
      isDismissed: notifications.isDismissed,
      createdAt: notifications.createdAt,
      metadata: notifications.metadata,
    })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.companyId, companyId),
        eq(notifications.isDismissed, false),
        filterClause(filter),
        cursor ? lt(notifications.createdAt, new Date(parseInt(cursor, 10))) : undefined
      )
    )
    .orderBy(desc(notifications.createdAt))
    .limit(limit)

  return rows as NotificationRow[]
}

export async function queryNotificationCounts(
  userId: string,
  companyId: string
): Promise<NotificationCounts> {
  const rows = await db
    .select({
      type: notifications.type,
      cnt: sql<number>`cast(count(*) as int)`,
    })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.companyId, companyId),
        eq(notifications.isRead, false),
        eq(notifications.isDismissed, false)
      )
    )
    .groupBy(notifications.type)

  const byType: Record<string, number> = {}
  for (const r of rows) byType[r.type] = r.cnt

  const alerts = (byType.error ?? 0) + (byType.warning ?? 0)
  const approvals = byType.action_required ?? 0
  const inbox = (byType.info ?? 0) + (byType.success ?? 0)

  return { all: alerts + approvals + inbox, alerts, approvals, inbox, system: 0 }
}

export async function markNotificationsRead(ids: string[], userId: string): Promise<void> {
  if (ids.length === 0) return
  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(inArray(notifications.id, ids), eq(notifications.userId, userId)))
}

export async function markAllNotificationsRead(
  userId: string,
  companyId: string,
  filter: NotificationFilter = "all"
): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.companyId, companyId),
        eq(notifications.isRead, false),
        filterClause(filter)
      )
    )
}

export async function dismissNotification(ids: string[], userId: string): Promise<void> {
  if (ids.length === 0) return
  await db
    .update(notifications)
    .set({ isDismissed: true, dismissedAt: new Date() })
    .where(and(inArray(notifications.id, ids), eq(notifications.userId, userId)))
}

export async function dismissAllNotifications(
  userId: string,
  companyId: string,
  filter: NotificationFilter = "all"
): Promise<void> {
  await db
    .update(notifications)
    .set({ isDismissed: true, dismissedAt: new Date() })
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.companyId, companyId),
        filterClause(filter)
      )
    )
}

export async function executeNotificationAction(
  id: string,
  action: NotificationActionKind,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const [notif] = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      entityType: notifications.entityType,
      entityId: notifications.entityId,
    })
    .from(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .limit(1)

  if (!notif) return { ok: false, error: "Not found" }
  if (notif.type !== "action_required") return { ok: false, error: "Not actionable" }

  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date(), isDismissed: true, dismissedAt: new Date() })
    .where(eq(notifications.id, id))

  // Entity-specific action routing
  const entityType = notif.entityType
  const entityId = notif.entityId
  const decision = action === "approve" ? "approved" : "rejected"

  if (entityType === "approval" && entityId) {
    await db
      .update(approvalRequests)
      .set({ status: decision, resolvedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(approvalRequests.id, entityId), inArray(approvalRequests.status, ["pending", "urgent"])))
  } else if (entityType === "purchase_order" && entityId) {
    await db
      .update(purchaseOrders)
      .set({ status: decision, updatedAt: new Date() })
      .where(and(eq(purchaseOrders.id, entityId), inArray(purchaseOrders.status, ["draft", "pending"])))
  } else if ((entityType === "time_off_request" || entityType === "leave_request") && entityId) {
    await db
      .update(leaveRequests)
      .set({ status: decision as "approved" | "rejected", updatedAt: new Date() })
      .where(and(eq(leaveRequests.id, entityId), eq(leaveRequests.status, "pending")))
  }

  return { ok: true }
}
