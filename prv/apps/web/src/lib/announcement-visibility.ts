// Announcement lifecycle visibility (Phase 13.4) — pure + unit-tested.
//
// An announcement moves through: scheduled (not yet published) → active →
// expired (past expiresAt) → archived (the cron stamped archivedAt) — and can be
// deleted at any point. The active company feed shows only ACTIVE announcements;
// this module is the single source of truth for that decision so the read routes
// and the expiry cron agree.
//
// SAFE-by-design: archiving is non-destructive. An expired/archived announcement
// is history — still reachable in admin and receipt views — never deleted.

export type AnnouncementLifecycleState = "scheduled" | "active" | "expired" | "archived" | "deleted"

export interface AnnouncementTimes {
  scheduledAt: Date | null
  publishedAt: Date | null
  expiresAt: Date | null
  archivedAt: Date | null
  deletedAt: Date | null
}

/**
 * The lifecycle state at time `now`. Precedence (most terminal first): deleted →
 * archived → expired → scheduled → active. Expiry is derived from expiresAt even
 * before the cron stamps archivedAt, so the feed never shows a lapsed item in the
 * window between expiry and the next hourly sweep.
 */
export function announcementLifecycleState(
  a: AnnouncementTimes,
  now: Date
): AnnouncementLifecycleState {
  if (a.deletedAt !== null) return "deleted"
  if (a.archivedAt !== null) return "archived"
  if (a.expiresAt !== null && a.expiresAt.getTime() <= now.getTime()) return "expired"
  if (a.scheduledAt !== null && a.scheduledAt.getTime() > now.getTime()) return "scheduled"
  return "active"
}

/** Only genuinely-active announcements belong in the live company feed. */
export function isAnnouncementActive(a: AnnouncementTimes, now: Date): boolean {
  return announcementLifecycleState(a, now) === "active"
}

/**
 * Should the hourly cron archive this announcement now? True only for a live
 * announcement (not deleted, not already archived) that has passed its expiry.
 * A null expiresAt means "never expires" — those are never auto-archived.
 */
export function shouldAutoArchive(a: AnnouncementTimes, now: Date): boolean {
  if (a.deletedAt !== null || a.archivedAt !== null) return false
  return a.expiresAt !== null && a.expiresAt.getTime() <= now.getTime()
}
