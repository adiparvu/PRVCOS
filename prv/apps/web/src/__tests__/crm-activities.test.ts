import { describe, it, expect } from "vitest"
import { activityState, isOverdue, summarizeActivities, sortActivities } from "@/lib/crm-activities"

const NOW = Date.parse("2026-07-02T12:00:00Z")
const past = "2026-07-01T00:00:00Z"
const future = "2026-07-10T00:00:00Z"

describe("activityState", () => {
  it("is done when completed, regardless of due date", () => {
    expect(activityState({ dueAt: past, completedAt: "2026-07-01T10:00:00Z" }, NOW)).toBe("done")
  })
  it("is overdue when past due and not completed", () => {
    expect(activityState({ dueAt: past, completedAt: null }, NOW)).toBe("overdue")
    expect(isOverdue({ dueAt: past, completedAt: null }, NOW)).toBe(true)
  })
  it("is scheduled when due in the future or undated", () => {
    expect(activityState({ dueAt: future, completedAt: null }, NOW)).toBe("scheduled")
    expect(activityState({ dueAt: null, completedAt: null }, NOW)).toBe("scheduled")
  })
})

describe("summarizeActivities", () => {
  it("counts open / overdue / done and tallies by type", () => {
    const s = summarizeActivities(
      [
        { dueAt: past, completedAt: null, type: "call" },
        { dueAt: future, completedAt: null, type: "meeting" },
        { dueAt: past, completedAt: "2026-07-01T10:00:00Z", type: "call" },
        { dueAt: null, completedAt: null, type: "note" },
      ] as never,
      NOW
    )
    expect(s.total).toBe(4)
    expect(s.done).toBe(1)
    expect(s.open).toBe(3)
    expect(s.overdue).toBe(1)
    expect(s.byType.call).toBe(2)
    expect(s.byType.meeting).toBe(1)
    expect(s.byType.demo).toBe(0)
  })
})

describe("sortActivities", () => {
  it("orders open (soonest due first) before completed (most recent first)", () => {
    const items = [
      { id: "done-old", dueAt: past, completedAt: "2026-06-20T00:00:00Z" },
      { id: "open-late", dueAt: future, completedAt: null },
      { id: "done-new", dueAt: past, completedAt: "2026-06-30T00:00:00Z" },
      { id: "open-overdue", dueAt: past, completedAt: null },
    ]
    const sorted = sortActivities(items, NOW).map((i) => i.id)
    expect(sorted).toEqual(["open-overdue", "open-late", "done-new", "done-old"])
  })
  it("sinks undated open activities below dated ones", () => {
    const items = [
      { id: "undated", dueAt: null, completedAt: null },
      { id: "dated", dueAt: future, completedAt: null },
    ]
    expect(sortActivities(items, NOW).map((i) => i.id)).toEqual(["dated", "undated"])
  })
})
