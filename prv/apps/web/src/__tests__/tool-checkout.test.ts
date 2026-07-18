import { describe, it, expect } from "vitest"
import {
  canCheckout,
  resolveReturnedToolStatus,
  checkoutDurationDays,
  isCheckoutOverdue,
  summarizeCheckout,
} from "@/lib/tool-checkout"

const DAY = 86_400_000

describe("canCheckout", () => {
  it("allows checkout only from the available state", () => {
    expect(canCheckout("available")).toBe(true)
    for (const s of ["in_use", "maintenance", "retired", "lost", "anything"]) {
      expect(canCheckout(s), s).toBe(false)
    }
  })
})

describe("resolveReturnedToolStatus", () => {
  it("routes a damaged tool to maintenance and an intact one to available", () => {
    expect(resolveReturnedToolStatus(true)).toBe("maintenance")
    expect(resolveReturnedToolStatus(false)).toBe("available")
  })
})

describe("checkoutDurationDays", () => {
  const out = new Date("2026-01-01T00:00:00Z")

  it("counts whole elapsed days", () => {
    expect(checkoutDurationDays(out, new Date(out.getTime() + 3 * DAY))).toBe(3)
    expect(checkoutDurationDays(out, new Date(out.getTime() + 3 * DAY - 1))).toBe(2)
  })

  it("floors a same-day or negative interval at zero", () => {
    expect(checkoutDurationDays(out, out)).toBe(0)
    expect(checkoutDurationDays(out, new Date(out.getTime() - DAY))).toBe(0)
  })
})

describe("isCheckoutOverdue", () => {
  const now = new Date("2026-01-10T00:00:00Z")

  it("is overdue when open and past the expected-return time", () => {
    expect(isCheckoutOverdue(new Date("2026-01-09T00:00:00Z"), null, now)).toBe(true)
  })

  it("is not overdue before the expected-return time", () => {
    expect(isCheckoutOverdue(new Date("2026-01-11T00:00:00Z"), null, now)).toBe(false)
  })

  it("is never overdue once returned, even if returned late", () => {
    expect(isCheckoutOverdue(new Date("2026-01-01T00:00:00Z"), now, now)).toBe(false)
  })

  it("is never overdue without an expected-return date", () => {
    expect(isCheckoutOverdue(null, null, now)).toBe(false)
  })
})

describe("summarizeCheckout", () => {
  const now = new Date("2026-01-10T00:00:00Z")

  it("summarizes an open, overdue checkout against now", () => {
    const s = summarizeCheckout(
      {
        checkedOutAt: new Date("2026-01-05T00:00:00Z"),
        expectedReturnAt: new Date("2026-01-08T00:00:00Z"),
        returnedAt: null,
      },
      now
    )
    expect(s).toEqual({ status: "open", durationDays: 5, overdue: true })
  })

  it("summarizes a returned checkout against its return time", () => {
    const s = summarizeCheckout(
      {
        checkedOutAt: new Date("2026-01-05T00:00:00Z"),
        expectedReturnAt: new Date("2026-01-08T00:00:00Z"),
        returnedAt: new Date("2026-01-07T00:00:00Z"),
      },
      now
    )
    expect(s).toEqual({ status: "returned", durationDays: 2, overdue: false })
  })
})
