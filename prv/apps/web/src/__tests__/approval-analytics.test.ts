import { describe, it, expect } from "vitest"
import { computeApprovalAnalytics } from "@/lib/approval-analytics"

const NOW = Date.parse("2026-07-15T00:00:00.000Z")
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString()

function appr(type: string, status: string, createdAt: string, resolvedAt: string | null = null) {
  return { type: type as never, status: status as never, createdAt, resolvedAt }
}

describe("computeApprovalAnalytics", () => {
  it("returns null rates for an empty queue", () => {
    const a = computeApprovalAnalytics([], NOW)
    expect(a.total).toBe(0)
    expect(a.approvalRatePct).toBeNull()
    expect(a.avgDecisionHours).toBeNull()
    expect(a.byType).toEqual([])
  })

  it("counts open (pending + urgent) and stale (> 48h) requests", () => {
    const a = computeApprovalAnalytics(
      [
        appr("purchase", "pending", hoursAgo(72)), // stale
        appr("leave", "urgent", hoursAgo(10)), // open, not stale
        appr("expense", "approved", hoursAgo(100), hoursAgo(96)),
      ],
      NOW
    )
    expect(a.open).toBe(2)
    expect(a.stale).toBe(1)
  })

  it("computes approval rate over decided requests only", () => {
    const a = computeApprovalAnalytics(
      [
        appr("purchase", "approved", hoursAgo(50), hoursAgo(40)),
        appr("purchase", "approved", hoursAgo(50), hoursAgo(30)),
        appr("purchase", "rejected", hoursAgo(50), hoursAgo(20)),
        appr("leave", "pending", hoursAgo(5)), // excluded from rate
      ],
      NOW
    )
    expect(a.approvalRatePct).toBe(round(200 / 3)) // 2 approved of 3 decided
  })

  it("computes the average decision time over resolved requests", () => {
    const a = computeApprovalAnalytics(
      [
        appr("purchase", "approved", hoursAgo(30), hoursAgo(20)), // 10h
        appr("leave", "rejected", hoursAgo(40), hoursAgo(20)), // 20h
      ],
      NOW
    )
    expect(a.avgDecisionHours).toBe(15)
  })

  it("breaks requests down by type, largest first", () => {
    const a = computeApprovalAnalytics(
      [
        appr("purchase", "pending", hoursAgo(1)),
        appr("purchase", "approved", hoursAgo(50), hoursAgo(40)),
        appr("leave", "pending", hoursAgo(1)),
      ],
      NOW
    )
    expect(a.byType[0]).toEqual({ type: "purchase", count: 2 })
    expect(a.byType[1]).toEqual({ type: "leave", count: 1 })
  })
})

function round(n: number): number {
  return Math.round(n * 10) / 10
}
