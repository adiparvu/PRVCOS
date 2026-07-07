import { describe, it, expect } from "vitest"
import { computeTaskDelivery } from "@/lib/task-delivery"

const NOW = Date.parse("2026-07-15T00:00:00.000Z")
const day = (d: number) => new Date(NOW + d * 86_400_000).toISOString().slice(0, 10)

function task(
  status: string,
  priority: string,
  dueDate: string | null = null,
  completedAt: string | null = null
) {
  return { status: status as never, priority: priority as never, dueDate, completedAt }
}

describe("computeTaskDelivery", () => {
  it("returns null rates for no tasks", () => {
    const d = computeTaskDelivery([], NOW)
    expect(d.total).toBe(0)
    expect(d.completionRatePct).toBeNull()
    expect(d.onTimeRatePct).toBeNull()
    expect(d.byPriority).toEqual([])
  })

  it("computes open, done, cancelled and completion rate over non-cancelled", () => {
    const d = computeTaskDelivery(
      [
        task("done", "medium"),
        task("todo", "medium"),
        task("in_progress", "high"),
        task("cancelled", "low"),
      ],
      NOW
    )
    expect(d.done).toBe(1)
    expect(d.cancelled).toBe(1)
    expect(d.open).toBe(2)
    expect(d.completionRatePct).toBe(round(100 / 3)) // 1 of 3 non-cancelled
  })

  it("counts overdue open tasks by due date, excluding done/cancelled", () => {
    const d = computeTaskDelivery(
      [
        task("todo", "high", day(-2)), // overdue
        task("in_progress", "medium", day(5)), // not due
        task("done", "medium", day(-3)), // done, not overdue
        task("cancelled", "low", day(-3)), // cancelled, not overdue
      ],
      NOW
    )
    expect(d.overdue).toBe(1)
  })

  it("computes the on-time rate over completed tasks that had a due date", () => {
    const d = computeTaskDelivery(
      [
        task("done", "medium", day(-1), "2026-07-13T10:00:00Z"), // due 14th, done 13th → on time
        task("done", "high", day(-5), "2026-07-14T10:00:00Z"), // due 10th, done 14th → late
        task("done", "low", null, "2026-07-10T10:00:00Z"), // no due date → excluded
      ],
      NOW
    )
    expect(d.onTimeRatePct).toBe(50) // 1 of 2 with due dates
  })

  it("breaks open tasks down by priority, critical first", () => {
    const d = computeTaskDelivery(
      [
        task("todo", "critical"),
        task("in_progress", "high"),
        task("done", "high"),
        task("todo", "low"),
      ],
      NOW
    )
    expect(d.byPriority.map((p) => p.priority)).toEqual(["critical", "high", "low"])
    const high = d.byPriority.find((p) => p.priority === "high")!
    expect(high.total).toBe(2)
    expect(high.open).toBe(1) // one done, one in_progress
  })
})

function round(n: number): number {
  return Math.round(n * 10) / 10
}
