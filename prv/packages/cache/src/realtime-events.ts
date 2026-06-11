import { getRedis } from "./client"

// ── Channel name builders ──────────────────────────────────────────────────────

export const realtimeChannel = {
  kpis: (companyId: string) => `kpis:${companyId}`,
  notifications: (userId: string) => `notifications:${userId}`,
  activity: (companyId: string) => `activity:${companyId}`,
  shift: (userId: string) => `shift:${userId}`,
  store: (storeId: string) => `store:${storeId}`,
  presence: (companyId: string) => `presence:${companyId}`,
  shop: (companyId: string) => `shop:${companyId}`,
} as const

// ── Event type constants ───────────────────────────────────────────────────────

export const REALTIME_EVENT = {
  KPI_UPDATE: "kpi.update",
  NOTIFICATION_COUNT: "notification.count",
  ACTIVITY: "activity.event",
  SHIFT_UPDATE: "shift.update",
  STORE_UPDATE: "store.update",
  SHOP_UPDATE: "shop.update",
} as const

export type RealtimeEventType = (typeof REALTIME_EVENT)[keyof typeof REALTIME_EVENT]

// ── Typed payloads ─────────────────────────────────────────────────────────────

export interface KpiUpdatePayload {
  revenue?: string
  workforce?: number
  activeProjects?: number
  alerts?: number
  pendingApprovals?: number
  periodKey: string
}

export interface NotificationCountPayload {
  unread: number
  delta: 1 | -1
}

export interface ActivityEventPayload {
  id: string
  type: "success" | "info" | "warning" | "error"
  title: string
  description?: string
  timestamp: string
  actorId?: string
}

export interface ShiftUpdatePayload {
  start: string
  end: string
  location: string
  progressPct: number
  remainingH: number
  remainingM: number
}

export interface StoreUpdatePayload {
  storeId: string
  metric: "sales" | "target" | "transactions"
  value: number
  timestamp: string
}

export interface ShopUpdatePayload {
  entityType: "order" | "product" | "review" | "stock"
  entityId: string
  action: "created" | "updated" | "deleted"
  companyId: string
}

export type RealtimePayloadMap = {
  [REALTIME_EVENT.KPI_UPDATE]: KpiUpdatePayload
  [REALTIME_EVENT.NOTIFICATION_COUNT]: NotificationCountPayload
  [REALTIME_EVENT.ACTIVITY]: ActivityEventPayload
  [REALTIME_EVENT.SHIFT_UPDATE]: ShiftUpdatePayload
  [REALTIME_EVENT.STORE_UPDATE]: StoreUpdatePayload
  [REALTIME_EVENT.SHOP_UPDATE]: ShopUpdatePayload
}

// ── Envelope ──────────────────────────────────────────────────────────────────

export interface RealtimeEvent<T = unknown> {
  id: string
  eventType: RealtimeEventType
  channel: string
  payload: T
  ts: number
}

// ── Server-side publishing — Redis List stream (serverless-safe) ───────────────
// Events RPUSH'd into a capped list. SSE endpoint polls with LRANGE + ts filter.
// Compatible with Upstash HTTP Redis (no blocking subscribe needed).

const STREAM_MAX_LEN = 200
const STREAM_TTL_S = 3_600

export async function appendRealtimeEvent<K extends RealtimeEventType>(
  channel: string,
  eventType: K,
  payload: RealtimePayloadMap[K]
): Promise<void> {
  const redis = getRedis()
  const key = `rt:stream:${channel}`
  const event: RealtimeEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    eventType,
    channel,
    payload,
    ts: Date.now(),
  }
  await Promise.all([redis.rpush(key, JSON.stringify(event)), redis.expire(key, STREAM_TTL_S)])
  void redis.ltrim(key, -STREAM_MAX_LEN, -1).catch(() => null)
}

export async function readRealtimeEvents(channel: string, since: number): Promise<RealtimeEvent[]> {
  const redis = getRedis()
  const key = `rt:stream:${channel}`
  const raw = await redis.lrange(key, 0, -1)
  const events: RealtimeEvent[] = []
  for (const item of raw) {
    try {
      const e = JSON.parse(typeof item === "string" ? item : JSON.stringify(item)) as RealtimeEvent
      if (e.ts > since) events.push(e)
    } catch {}
  }
  return events
}
