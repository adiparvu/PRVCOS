import { describe, it, expect } from "vitest"
import { buildDigest, type DigestNotificationLike } from "@/lib/notification-digest"

function n(o: Partial<DigestNotificationLike> & { id: string }): DigestNotificationLike {
  return {
    type: "info",
    title: "Something happened",
    body: null,
    actionUrl: null,
    entityType: "task",
    createdAt: "2026-07-02T10:00:00Z",
    ...o,
  }
}

describe("buildDigest", () => {
  it("groups by module, orders by size, and pluralizes labels", () => {
    const d = buildDigest([
      n({ id: "1", entityType: "task" }),
      n({ id: "2", entityType: "task" }),
      n({ id: "3", entityType: "invoice" }),
    ])
    expect(d.total).toBe(3)
    expect(d.groups[0]!.key).toBe("task")
    expect(d.groups[0]!.count).toBe(2)
    expect(d.groups[0]!.label).toBe("tasks")
    expect(d.groups[1]!.key).toBe("invoice")
    expect(d.groups[1]!.label).toBe("invoice") // singular for count 1
  })

  it("counts action-required and builds a summary line", () => {
    const d = buildDigest([
      n({ id: "1", entityType: "invoice", type: "action_required" }),
      n({ id: "2", entityType: "task", type: "info" }),
      n({ id: "3", entityType: "task", type: "action_required" }),
    ])
    expect(d.actionRequired).toBe(2)
    expect(d.summary).toBe("2 tasks · 1 invoice")
  })

  it("buckets null entityType under general", () => {
    const d = buildDigest([n({ id: "1", entityType: null })])
    expect(d.groups[0]!.key).toBe("general")
    expect(d.groups[0]!.label).toBe("notification")
  })

  it("returns a caught-up summary for an empty window", () => {
    const d = buildDigest([])
    expect(d.total).toBe(0)
    expect(d.groups).toEqual([])
    expect(d.summary).toBe("You're all caught up.")
  })

  it("pluralizes multi-word labels correctly", () => {
    const d = buildDigest([
      n({ id: "1", entityType: "leave" }),
      n({ id: "2", entityType: "leave" }),
    ])
    expect(d.groups[0]!.label).toBe("leave requests")
  })
})
