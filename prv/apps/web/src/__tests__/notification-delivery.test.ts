import { describe, it, expect } from "vitest"
import {
  parseHHMM,
  isWithinQuietHours,
  shouldDeliver,
  type DeliveryPrefs,
} from "@/lib/notification-delivery"

const on: DeliveryPrefs = {
  inApp: true,
  push: true,
  email: true,
  sms: true,
  quietHoursStart: null,
  quietHoursEnd: null,
}

describe("parseHHMM", () => {
  it("parses valid times to minutes", () => {
    expect(parseHHMM("00:00")).toBe(0)
    expect(parseHHMM("07:30")).toBe(450)
    expect(parseHHMM("23:59")).toBe(1439)
  })
  it("rejects malformed or out-of-range", () => {
    expect(parseHHMM(null)).toBeNull()
    expect(parseHHMM("24:00")).toBeNull()
    expect(parseHHMM("10:60")).toBeNull()
    expect(parseHHMM("nope")).toBeNull()
  })
})

describe("isWithinQuietHours", () => {
  it("handles a same-day window", () => {
    expect(isWithinQuietHours("09:00", "17:00", "12:00")).toBe(true)
    expect(isWithinQuietHours("09:00", "17:00", "08:59")).toBe(false)
    expect(isWithinQuietHours("09:00", "17:00", "17:00")).toBe(false) // end exclusive
  })
  it("handles a window wrapping past midnight", () => {
    expect(isWithinQuietHours("22:00", "07:00", "23:30")).toBe(true)
    expect(isWithinQuietHours("22:00", "07:00", "03:00")).toBe(true)
    expect(isWithinQuietHours("22:00", "07:00", "07:00")).toBe(false)
    expect(isWithinQuietHours("22:00", "07:00", "12:00")).toBe(false)
  })
  it("is false when bounds are missing or equal", () => {
    expect(isWithinQuietHours(null, "07:00", "03:00")).toBe(false)
    expect(isWithinQuietHours("08:00", "08:00", "08:00")).toBe(false)
  })
})

describe("shouldDeliver", () => {
  it("critical always reaches in-app and honors channel toggles otherwise", () => {
    expect(shouldDeliver({ ...on, inApp: false }, "critical", "in_app", "03:00")).toBe(true)
    expect(shouldDeliver({ ...on, push: false }, "critical", "push", "03:00")).toBe(false)
    expect(shouldDeliver(on, "critical", "sms", "03:00")).toBe(true)
  })

  it("respects a disabled channel for non-critical", () => {
    expect(shouldDeliver({ ...on, push: false }, "normal", "push", "12:00")).toBe(false)
    expect(shouldDeliver(on, "normal", "push", "12:00")).toBe(true)
  })

  it("suppresses interruptive channels during quiet hours (non-critical)", () => {
    const p: DeliveryPrefs = { ...on, quietHoursStart: "22:00", quietHoursEnd: "07:00" }
    expect(shouldDeliver(p, "normal", "push", "23:00")).toBe(false)
    expect(shouldDeliver(p, "normal", "sms", "23:00")).toBe(false)
    // in-app + email still land during quiet hours
    expect(shouldDeliver(p, "normal", "in_app", "23:00")).toBe(true)
    expect(shouldDeliver(p, "normal", "email", "23:00")).toBe(true)
    // outside quiet hours push is fine
    expect(shouldDeliver(p, "normal", "push", "12:00")).toBe(true)
  })

  it("DND suppresses interruptive channels regardless of the clock", () => {
    const p: DeliveryPrefs = { ...on, doNotDisturb: true }
    expect(shouldDeliver(p, "normal", "push", "12:00")).toBe(false)
    expect(shouldDeliver(p, "normal", "in_app", "12:00")).toBe(true)
    // critical bypasses DND
    expect(shouldDeliver(p, "critical", "push", "12:00")).toBe(true)
  })
})
