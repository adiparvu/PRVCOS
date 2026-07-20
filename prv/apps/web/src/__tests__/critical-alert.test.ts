import { describe, it, expect } from "vitest"
import {
  isCriticalPending,
  isAckEscalationDue,
  ageInMinutes,
  CRITICAL_ESCALATE_MINUTES,
  type CriticalAlertRow,
} from "@/lib/critical-alert"

const NOW = new Date("2026-07-20T12:00:00.000Z")
const min = (m: number) => new Date(NOW.getTime() - m * 60_000)

function row(over: Partial<CriticalAlertRow> = {}): CriticalAlertRow {
  return {
    isDismissed: false,
    requiresAck: true,
    acknowledgedAt: null,
    ackEscalatedAt: null,
    scheduledFor: null,
    expiresAt: null,
    createdAt: min(1),
    ...over,
  }
}

describe("isCriticalPending", () => {
  it("true for an unacknowledged, undismissed, in-window critical alert", () => {
    expect(isCriticalPending(row(), NOW)).toBe(true)
  })
  it("false when not requiring ack", () => {
    expect(isCriticalPending(row({ requiresAck: false }), NOW)).toBe(false)
  })
  it("false once acknowledged", () => {
    expect(isCriticalPending(row({ acknowledgedAt: NOW }), NOW)).toBe(false)
  })
  it("false when dismissed", () => {
    expect(isCriticalPending(row({ isDismissed: true }), NOW)).toBe(false)
  })
  it("false before scheduledFor and after expiresAt", () => {
    expect(isCriticalPending(row({ scheduledFor: new Date(NOW.getTime() + 60_000) }), NOW)).toBe(
      false
    )
    expect(isCriticalPending(row({ expiresAt: min(1) }), NOW)).toBe(false)
  })
})

describe("ageInMinutes", () => {
  it("floors and never negative", () => {
    expect(ageInMinutes(min(20), NOW)).toBe(20)
    expect(ageInMinutes(new Date(NOW.getTime() + 60_000), NOW)).toBe(0)
  })
})

describe("isAckEscalationDue", () => {
  it("escalates a pending alert older than the threshold", () => {
    expect(isAckEscalationDue(row({ createdAt: min(20) }), NOW)).toBe(true)
  })
  it("does not escalate before the threshold", () => {
    expect(isAckEscalationDue(row({ createdAt: min(10) }), NOW)).toBe(false)
  })
  it("does not escalate twice (ackEscalatedAt set)", () => {
    expect(isAckEscalationDue(row({ createdAt: min(20), ackEscalatedAt: NOW }), NOW)).toBe(false)
  })
  it("does not escalate an acknowledged alert", () => {
    expect(isAckEscalationDue(row({ createdAt: min(20), acknowledgedAt: NOW }), NOW)).toBe(false)
  })
  it("uses the 15-minute default threshold", () => {
    expect(CRITICAL_ESCALATE_MINUTES).toBe(15)
    expect(isAckEscalationDue(row({ createdAt: min(15) }), NOW)).toBe(true)
    expect(isAckEscalationDue(row({ createdAt: min(14) }), NOW)).toBe(false)
  })
})
