// Announcement read-receipt & acknowledgment math (Phase 13.4). Pure + tested.

export type AnnouncementPriority = "info" | "important" | "critical"

export const PRIORITY_RANK: Record<AnnouncementPriority, number> = {
  critical: 3,
  important: 2,
  info: 1,
}

export interface ReceiptInput {
  totalAudience: number
  readCount: number
  ackCount: number
  acknowledgmentRequired: boolean
}

export interface Receipt {
  totalAudience: number
  readCount: number
  ackCount: number
  readPct: number // 0–100
  ackPct: number // 0–100 (0 when ack not required)
  unread: number
  unacked: number // outstanding acks when required, else 0
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0
  return Math.min(100, Math.round((Math.max(0, part) / whole) * 1000) / 10)
}

export function computeReceipt(i: ReceiptInput): Receipt {
  const total = Math.max(0, i.totalAudience)
  const read = Math.min(total, Math.max(0, i.readCount))
  const ack = Math.min(total, Math.max(0, i.ackCount))
  return {
    totalAudience: total,
    readCount: read,
    ackCount: ack,
    readPct: pct(read, total),
    ackPct: i.acknowledgmentRequired ? pct(ack, total) : 0,
    unread: Math.max(0, total - read),
    unacked: i.acknowledgmentRequired ? Math.max(0, total - ack) : 0,
  }
}

export type AnnouncementLifecycle = "scheduled" | "active" | "expired"

export function announcementLifecycle(
  publishedAt: string | null,
  scheduledAt: string | null,
  expiresAt: string | null,
  nowMs: number
): AnnouncementLifecycle {
  if (expiresAt) {
    const exp = Date.parse(expiresAt)
    if (Number.isFinite(exp) && exp <= nowMs) return "expired"
  }
  if (!publishedAt && scheduledAt) {
    const sch = Date.parse(scheduledAt)
    if (Number.isFinite(sch) && sch > nowMs) return "scheduled"
  }
  return "active"
}
