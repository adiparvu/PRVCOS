// Notification feed visibility (Phase 13) — pure + unit-tested.
//
// A notification row may carry a `scheduledFor` (deliver later) and/or an
// `expiresAt` (auto-hide after). The dispatch endpoint accepts both, but the
// feed queries historically ignored them — so a future-scheduled notification
// showed immediately and an expired one never dropped. This predicate is the
// single source of truth for whether a row belongs in a user's live feed; the
// SQL in queries/notifications.ts mirrors it exactly.
//
// A row is visible when it is NOT dismissed, its scheduledFor is null or has
// passed, and its expiresAt is null or is still in the future.

export interface NotificationVisibilityTimes {
  isDismissed: boolean
  scheduledFor: Date | null
  expiresAt: Date | null
}

export function isNotificationVisible(n: NotificationVisibilityTimes, now: Date): boolean {
  if (n.isDismissed) return false
  if (n.scheduledFor !== null && n.scheduledFor.getTime() > now.getTime()) return false
  if (n.expiresAt !== null && n.expiresAt.getTime() <= now.getTime()) return false
  return true
}
