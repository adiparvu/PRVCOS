import { describe, it, expect } from "vitest"
import {
  isNotificationVisible,
  type NotificationVisibilityTimes,
} from "../queries/notification-visibility"

const NOW = new Date("2026-07-20T12:00:00.000Z")
const past = new Date(NOW.getTime() - 3600_000)
const future = new Date(NOW.getTime() + 3600_000)

function n(over: Partial<NotificationVisibilityTimes> = {}): NotificationVisibilityTimes {
  return { isDismissed: false, scheduledFor: null, expiresAt: null, ...over }
}

describe("isNotificationVisible", () => {
  it("plain undismissed notification is visible", () => {
    expect(isNotificationVisible(n(), NOW)).toBe(true)
  })
  it("dismissed is never visible", () => {
    expect(isNotificationVisible(n({ isDismissed: true }), NOW)).toBe(false)
  })
  it("future scheduledFor hides until due", () => {
    expect(isNotificationVisible(n({ scheduledFor: future }), NOW)).toBe(false)
  })
  it("past scheduledFor is visible", () => {
    expect(isNotificationVisible(n({ scheduledFor: past }), NOW)).toBe(true)
  })
  it("scheduledFor exactly now is visible (<= now)", () => {
    expect(isNotificationVisible(n({ scheduledFor: NOW }), NOW)).toBe(true)
  })
  it("past expiresAt hides", () => {
    expect(isNotificationVisible(n({ expiresAt: past }), NOW)).toBe(false)
  })
  it("expiresAt exactly now hides (<= now)", () => {
    expect(isNotificationVisible(n({ expiresAt: NOW }), NOW)).toBe(false)
  })
  it("future expiresAt stays visible", () => {
    expect(isNotificationVisible(n({ expiresAt: future }), NOW)).toBe(true)
  })
  it("scheduled-and-not-yet-expired window is visible", () => {
    expect(isNotificationVisible(n({ scheduledFor: past, expiresAt: future }), NOW)).toBe(true)
  })
})
