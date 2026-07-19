import { describe, it, expect } from "vitest"
import {
  isDeviceTrusted,
  deviceTrustExpiry,
  canSkipMfa,
  requiresStepUp,
  DEVICE_TRUST_DAYS,
} from "@/lib/device-trust"

const now = new Date("2026-01-15T00:00:00Z")

describe("isDeviceTrusted", () => {
  it("is false for missing, untrusted, or window-less devices", () => {
    expect(isDeviceTrusted(null, now)).toBe(false)
    expect(isDeviceTrusted({ isTrusted: false, trustExpiresAt: null }, now)).toBe(false)
    expect(isDeviceTrusted({ isTrusted: true, trustExpiresAt: null }, now)).toBe(false)
  })
  it("is true only within an unexpired window", () => {
    expect(
      isDeviceTrusted({ isTrusted: true, trustExpiresAt: new Date("2026-02-01T00:00:00Z") }, now)
    ).toBe(true)
    expect(
      isDeviceTrusted({ isTrusted: true, trustExpiresAt: new Date("2026-01-01T00:00:00Z") }, now)
    ).toBe(false)
  })
})

describe("deviceTrustExpiry", () => {
  it("is now + the trust window", () => {
    const exp = deviceTrustExpiry(now)
    expect(exp.getTime() - now.getTime()).toBe(DEVICE_TRUST_DAYS * 86_400_000)
  })
})

describe("canSkipMfa", () => {
  it("mirrors device trust", () => {
    expect(
      canSkipMfa({ isTrusted: true, trustExpiresAt: new Date("2026-02-01T00:00:00Z") }, now)
    ).toBe(true)
    expect(canSkipMfa(null, now)).toBe(false)
  })
})

describe("requiresStepUp", () => {
  it("always steps up on an untrusted device", () => {
    expect(requiresStepUp({ deviceTrusted: false, reauthFresh: true })).toBe(true)
    expect(requiresStepUp({ deviceTrusted: false, reauthFresh: false })).toBe(true)
  })
  it("on a trusted device, steps up only when re-auth is stale", () => {
    expect(requiresStepUp({ deviceTrusted: true, reauthFresh: true })).toBe(false)
    expect(requiresStepUp({ deviceTrusted: true, reauthFresh: false })).toBe(true)
  })
})
