import { describe, it, expect } from "vitest"
import { buildRecurringTask, recurringFrequencyLabel } from "@/lib/recurring-task"

const cfg = {
  companyId: "co",
  projectId: "pr",
  title: "Weekly site inspection",
  description: null,
  priority: "high" as const,
  estimatedHours: "2.00",
  assigneeId: "u1",
}

describe("buildRecurringTask", () => {
  it("builds a backlog task appended after the current max order", () => {
    expect(buildRecurringTask(cfg, { startOrderIndex: 7 })).toEqual({
      companyId: "co",
      projectId: "pr",
      title: "Weekly site inspection",
      description: null,
      priority: "high",
      estimatedHours: "2.00",
      assigneeId: "u1",
      status: "backlog",
      orderIndex: 8,
    })
  })
  it("treats a non-finite start index as 0", () => {
    expect(buildRecurringTask(cfg, { startOrderIndex: Number.NaN }).orderIndex).toBe(1)
  })
})

describe("recurringFrequencyLabel", () => {
  it("labels frequencies in Romanian", () => {
    expect(recurringFrequencyLabel("daily")).toBe("Zilnic")
    expect(recurringFrequencyLabel("weekly")).toBe("Săptămânal")
    expect(recurringFrequencyLabel("monthly")).toBe("Lunar")
  })
})
