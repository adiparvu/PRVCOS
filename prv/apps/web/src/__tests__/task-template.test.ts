import { describe, it, expect } from "vitest"
import { normalizeTemplateItems, buildTasksFromTemplate } from "@/lib/task-template"

describe("normalizeTemplateItems", () => {
  it("keeps valid items and applies defaults", () => {
    const items = normalizeTemplateItems([
      { title: "  Demolition  ", priority: "high", estimatedHours: 4 },
      { title: "Wiring", description: "  rough-in  " },
    ])
    expect(items).toEqual([
      { title: "Demolition", description: null, priority: "high", estimatedHours: "4.00" },
      { title: "Wiring", description: "rough-in", priority: "medium", estimatedHours: null },
    ])
  })
  it("drops items without a usable title", () => {
    expect(normalizeTemplateItems([{ title: "  " }, { description: "x" }, 5, null])).toEqual([])
  })
  it("falls back to medium for an invalid priority and null for bad hours", () => {
    const item = normalizeTemplateItems([
      { title: "T", priority: "urgent", estimatedHours: -3 },
    ])[0]!
    expect(item.priority).toBe("medium")
    expect(item.estimatedHours).toBeNull()
  })
  it("returns empty for non-array input", () => {
    expect(normalizeTemplateItems("nope")).toEqual([])
    expect(normalizeTemplateItems(null)).toEqual([])
  })
})

describe("buildTasksFromTemplate", () => {
  const items = normalizeTemplateItems([{ title: "A", priority: "low" }, { title: "B" }])
  it("expands items into backlog tasks with sequential orderIndex after the current max", () => {
    const built = buildTasksFromTemplate(items, {
      companyId: "co",
      projectId: "pr",
      startOrderIndex: 10,
    })
    expect(built).toHaveLength(2)
    expect(built[0]!).toMatchObject({
      companyId: "co",
      projectId: "pr",
      title: "A",
      priority: "low",
      status: "backlog",
      orderIndex: 11,
    })
    expect(built[1]!.orderIndex).toBe(12)
  })
  it("treats a non-finite start index as 0", () => {
    const built = buildTasksFromTemplate(items, {
      companyId: "co",
      projectId: "pr",
      startOrderIndex: Number.NaN,
    })
    expect(built[0]!.orderIndex).toBe(1)
  })
})
