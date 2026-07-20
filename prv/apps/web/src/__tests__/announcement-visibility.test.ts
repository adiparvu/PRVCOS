import { describe, it, expect } from "vitest"
import {
  announcementLifecycleState,
  isAnnouncementActive,
  shouldAutoArchive,
  type AnnouncementTimes,
} from "@/lib/announcement-visibility"

const NOW = new Date("2026-07-20T12:00:00.000Z")
const past = new Date(NOW.getTime() - 3600_000)
const future = new Date(NOW.getTime() + 3600_000)

function a(over: Partial<AnnouncementTimes> = {}): AnnouncementTimes {
  return {
    scheduledAt: null,
    publishedAt: past,
    expiresAt: null,
    archivedAt: null,
    deletedAt: null,
    ...over,
  }
}

describe("announcementLifecycleState", () => {
  it("active by default (published, no expiry)", () => {
    expect(announcementLifecycleState(a(), NOW)).toBe("active")
  })
  it("scheduled when scheduledAt is in the future", () => {
    expect(announcementLifecycleState(a({ scheduledAt: future }), NOW)).toBe("scheduled")
  })
  it("expired when past expiresAt even before the cron archives", () => {
    expect(announcementLifecycleState(a({ expiresAt: past }), NOW)).toBe("expired")
  })
  it("not expired when expiresAt is still in the future", () => {
    expect(announcementLifecycleState(a({ expiresAt: future }), NOW)).toBe("active")
  })
  it("archived takes precedence over mere expiry", () => {
    expect(announcementLifecycleState(a({ expiresAt: past, archivedAt: past }), NOW)).toBe(
      "archived"
    )
  })
  it("deleted is the most terminal state", () => {
    expect(
      announcementLifecycleState(a({ archivedAt: past, deletedAt: past, expiresAt: past }), NOW)
    ).toBe("deleted")
  })
  it("expiry exactly at now counts as expired (<=)", () => {
    expect(announcementLifecycleState(a({ expiresAt: NOW }), NOW)).toBe("expired")
  })
})

describe("isAnnouncementActive", () => {
  it("true only for active", () => {
    expect(isAnnouncementActive(a(), NOW)).toBe(true)
    expect(isAnnouncementActive(a({ expiresAt: past }), NOW)).toBe(false)
    expect(isAnnouncementActive(a({ scheduledAt: future }), NOW)).toBe(false)
    expect(isAnnouncementActive(a({ archivedAt: past }), NOW)).toBe(false)
    expect(isAnnouncementActive(a({ deletedAt: past }), NOW)).toBe(false)
  })
})

describe("shouldAutoArchive", () => {
  it("archives a live, expired, not-yet-archived announcement", () => {
    expect(shouldAutoArchive(a({ expiresAt: past }), NOW)).toBe(true)
  })
  it("skips never-expiring announcements", () => {
    expect(shouldAutoArchive(a({ expiresAt: null }), NOW)).toBe(false)
  })
  it("skips announcements not yet expired", () => {
    expect(shouldAutoArchive(a({ expiresAt: future }), NOW)).toBe(false)
  })
  it("idempotent: skips already-archived", () => {
    expect(shouldAutoArchive(a({ expiresAt: past, archivedAt: past }), NOW)).toBe(false)
  })
  it("skips deleted announcements", () => {
    expect(shouldAutoArchive(a({ expiresAt: past, deletedAt: past }), NOW)).toBe(false)
  })
})
