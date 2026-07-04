import { describe, it, expect } from "vitest"
import { computeReceipt, announcementLifecycle } from "@/lib/announcement-receipts"

describe("computeReceipt", () => {
  it("computes read % and outstanding unread", () => {
    const r = computeReceipt({
      totalAudience: 140,
      readCount: 121,
      ackCount: 0,
      acknowledgmentRequired: false,
    })
    expect(r.readPct).toBe(86.4)
    expect(r.unread).toBe(19)
    expect(r.ackPct).toBe(0) // ack not required
    expect(r.unacked).toBe(0)
  })

  it("computes ack % and outstanding unacked when required", () => {
    const r = computeReceipt({
      totalAudience: 100,
      readCount: 80,
      ackCount: 45,
      acknowledgmentRequired: true,
    })
    expect(r.ackPct).toBe(45)
    expect(r.unacked).toBe(55)
  })

  it("handles a zero audience without dividing by zero", () => {
    const r = computeReceipt({
      totalAudience: 0,
      readCount: 0,
      ackCount: 0,
      acknowledgmentRequired: true,
    })
    expect(r.readPct).toBe(0)
    expect(r.ackPct).toBe(0)
    expect(r.unread).toBe(0)
  })

  it("clamps counts above the audience", () => {
    const r = computeReceipt({
      totalAudience: 10,
      readCount: 99,
      ackCount: 99,
      acknowledgmentRequired: true,
    })
    expect(r.readPct).toBe(100)
    expect(r.readCount).toBe(10)
    expect(r.unread).toBe(0)
  })
})

describe("announcementLifecycle", () => {
  const NOW = Date.parse("2026-07-02T12:00:00Z")
  it("is expired past the expiry", () => {
    expect(announcementLifecycle("2026-06-01T00:00:00Z", null, "2026-06-30T00:00:00Z", NOW)).toBe(
      "expired"
    )
  })
  it("is scheduled when unpublished with a future schedule", () => {
    expect(announcementLifecycle(null, "2026-08-01T00:00:00Z", null, NOW)).toBe("scheduled")
  })
  it("is active otherwise", () => {
    expect(announcementLifecycle("2026-06-01T00:00:00Z", null, "2030-01-01T00:00:00Z", NOW)).toBe(
      "active"
    )
    expect(announcementLifecycle("2026-06-01T00:00:00Z", null, null, NOW)).toBe("active")
  })
})
