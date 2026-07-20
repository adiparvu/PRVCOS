import { describe, it, expect } from "vitest"
import {
  ageInMinutes,
  isPendingAction,
  policyMatches,
  selectPolicy,
  escalationTargets,
  type EscalatableNotification,
  type EscalationPolicy,
} from "@/lib/notification-escalation"

const NOW = new Date("2026-07-20T12:00:00.000Z")

function notif(over: Partial<EscalatableNotification> = {}): EscalatableNotification {
  return {
    id: "n1",
    companyId: "c1",
    userId: "u1",
    type: "action_required",
    entityType: null,
    isRead: false,
    isDismissed: false,
    escalatedAt: null,
    createdAt: new Date(NOW.getTime() - 90 * 60_000), // 90 min old
    ...over,
  }
}

function policy(over: Partial<EscalationPolicy> = {}): EscalationPolicy {
  return {
    id: "p1",
    companyId: "c1",
    entityType: null,
    slaMinutes: 60,
    escalateToUserId: "mgr",
    isActive: true,
    ...over,
  }
}

describe("ageInMinutes", () => {
  it("floors elapsed minutes and never goes negative", () => {
    expect(ageInMinutes(new Date(NOW.getTime() - 90 * 60_000), NOW)).toBe(90)
    expect(ageInMinutes(new Date(NOW.getTime() - 59_000), NOW)).toBe(0)
    expect(ageInMinutes(new Date(NOW.getTime() + 5 * 60_000), NOW)).toBe(0) // future
  })
})

describe("isPendingAction", () => {
  it("only action_required, unread, undismissed, not-yet-escalated qualifies", () => {
    expect(isPendingAction(notif())).toBe(true)
    expect(isPendingAction(notif({ type: "info" }))).toBe(false)
    expect(isPendingAction(notif({ isRead: true }))).toBe(false)
    expect(isPendingAction(notif({ isDismissed: true }))).toBe(false)
    expect(isPendingAction(notif({ escalatedAt: NOW }))).toBe(false)
  })
})

describe("policyMatches", () => {
  it("requires same company and active", () => {
    expect(policyMatches(policy(), notif())).toBe(true)
    expect(policyMatches(policy({ isActive: false }), notif())).toBe(false)
    expect(policyMatches(policy({ companyId: "other" }), notif())).toBe(false)
  })
  it("entityType-scoped policy only matches that entityType", () => {
    const p = policy({ entityType: "safety_permit" })
    expect(policyMatches(p, notif({ entityType: "safety_permit" }))).toBe(true)
    expect(policyMatches(p, notif({ entityType: "approval" }))).toBe(false)
    expect(policyMatches(p, notif({ entityType: null }))).toBe(false)
  })
})

describe("selectPolicy", () => {
  it("prefers a specific entityType policy over a company-wide one", () => {
    const wide = policy({ id: "wide", entityType: null, slaMinutes: 30 })
    const specific = policy({ id: "spec", entityType: "safety_permit", slaMinutes: 120 })
    const chosen = selectPolicy([wide, specific], notif({ entityType: "safety_permit" }))
    expect(chosen?.id).toBe("spec") // specific wins even with a looser SLA
  })
  it("within equal specificity, the tightest SLA wins", () => {
    const a = policy({ id: "a", slaMinutes: 60 })
    const b = policy({ id: "b", slaMinutes: 30 })
    expect(selectPolicy([a, b], notif())?.id).toBe("b")
  })
  it("returns null when nothing governs", () => {
    expect(selectPolicy([policy({ entityType: "x" })], notif({ entityType: "y" }))).toBeNull()
  })
})

describe("escalationTargets", () => {
  it("escalates a breached, pending notification to the policy's explicit target", () => {
    const out = escalationTargets([notif()], [policy()], NOW)
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ notificationId: "n1", escalateToUserId: "mgr", ageMinutes: 90 })
  })
  it("does not escalate before the SLA is breached", () => {
    const young = notif({ createdAt: new Date(NOW.getTime() - 30 * 60_000) }) // 30 < 60
    expect(escalationTargets([young], [policy()], NOW)).toHaveLength(0)
  })
  it("skips self-escalation when the target is the original recipient", () => {
    expect(escalationTargets([notif({ userId: "mgr" })], [policy()], NOW)).toHaveLength(0)
  })
  it("ignores already-acknowledged or already-escalated notifications", () => {
    const rows = [
      notif({ id: "read", isRead: true }),
      notif({ id: "dismissed", isDismissed: true }),
      notif({ id: "done", escalatedAt: NOW }),
      notif({ id: "live" }),
    ]
    const out = escalationTargets(rows, [policy()], NOW)
    expect(out.map((t) => t.notificationId)).toEqual(["live"])
  })
})
