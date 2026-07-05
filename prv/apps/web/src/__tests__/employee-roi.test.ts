import { describe, it, expect } from "vitest"
import { computeEmployeeRoi } from "@/lib/employee-roi"

describe("computeEmployeeRoi", () => {
  it("computes cost-per-task and bands relative to the team average", () => {
    // Team avg cost-per-task = (2000+4000+6000) / (10+10+10) = 12000/30 = 400.
    const roi = computeEmployeeRoi([
      { userId: "cheap", name: "Cheap", payrollCost: 2000, tasksCompleted: 10 }, // 200 <= 300 → high
      { userId: "mid", name: "Mid", payrollCost: 4000, tasksCompleted: 10 }, //    400 → steady
      { userId: "dear", name: "Dear", payrollCost: 6000, tasksCompleted: 10 }, //  600 >= 500 → low
    ])
    const byId = Object.fromEntries(roi.employees.map((e) => [e.userId, e]))
    expect(roi.avgCostPerTask).toBe(400)
    expect(byId.cheap!.costPerTask).toBe(200)
    expect(byId.cheap!.band).toBe("high")
    expect(byId.mid!.band).toBe("steady")
    expect(byId.dear!.costPerTask).toBe(600)
    expect(byId.dear!.band).toBe("low")
  })

  it("marks a paid employee with no completed tasks as no_output with null cost-per-task", () => {
    const roi = computeEmployeeRoi([
      { userId: "a", name: "A", payrollCost: 3000, tasksCompleted: 5 },
      { userId: "idle", name: "Idle", payrollCost: 5000, tasksCompleted: 0 },
    ])
    const idle = roi.employees.find((e) => e.userId === "idle")!
    expect(idle.costPerTask).toBeNull()
    expect(idle.band).toBe("no_output")
    expect(roi.noOutputCount).toBe(1)
    // no-output employees are excluded from the team average
    expect(roi.avgCostPerTask).toBe(600)
  })

  it("ranks cheapest cost-per-task first and pushes no-output employees last", () => {
    const roi = computeEmployeeRoi([
      { userId: "idle", name: "Idle", payrollCost: 1000, tasksCompleted: 0 },
      { userId: "dear", name: "Dear", payrollCost: 6000, tasksCompleted: 10 }, // 600
      { userId: "cheap", name: "Cheap", payrollCost: 1000, tasksCompleted: 10 }, // 100
    ])
    expect(roi.employees.map((e) => e.userId)).toEqual(["cheap", "dear", "idle"])
  })

  it("rolls up team totals and clamps negative/non-finite inputs", () => {
    const roi = computeEmployeeRoi([
      { userId: "a", name: "A", payrollCost: 2000, tasksCompleted: 8 },
      { userId: "b", name: "B", payrollCost: -500, tasksCompleted: Number.NaN },
    ])
    expect(roi.totalCost).toBe(2000)
    expect(roi.totalTasks).toBe(8)
    const b = roi.employees.find((e) => e.userId === "b")!
    expect(b.payrollCost).toBe(0)
    expect(b.tasksCompleted).toBe(0)
    expect(b.band).toBe("no_output")
  })

  it("returns null team average when nobody has delivered any tasks", () => {
    const roi = computeEmployeeRoi([
      { userId: "a", name: "A", payrollCost: 1000, tasksCompleted: 0 },
    ])
    expect(roi.avgCostPerTask).toBeNull()
    expect(roi.totalTasks).toBe(0)
  })
})
