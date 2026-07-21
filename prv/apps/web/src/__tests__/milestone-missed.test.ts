import { describe, it, expect } from "vitest"
import {
  MILESTONE_MISSED_TRIGGER,
  daysOverdue,
  buildMilestoneMissedAlert,
} from "../../../../packages/jobs/src/lib/milestone-missed"

describe("daysOverdue", () => {
  const now = Date.parse("2026-07-21T09:00:00.000Z")

  it("returns 0 for a date not yet passed", () => {
    expect(daysOverdue("2026-07-25", now)).toBe(0)
  })

  it("returns 0 for today (same UTC day, floored)", () => {
    expect(daysOverdue("2026-07-21", now)).toBe(0)
  })

  it("counts whole days past the planned end", () => {
    expect(daysOverdue("2026-07-20", now)).toBe(1)
    expect(daysOverdue("2026-07-14", now)).toBe(7)
  })

  it("tolerates a full timestamp by slicing to the date", () => {
    expect(daysOverdue("2026-07-14T23:59:00.000Z", now)).toBe(7)
  })

  it("returns 0 for an unparseable date", () => {
    expect(daysOverdue("not-a-date", now)).toBe(0)
  })
})

describe("buildMilestoneMissedAlert", () => {
  const now = new Date("2026-07-21T09:00:00.000Z")
  const base = {
    recipientId: "user-1",
    companyId: "co-1",
    phaseId: "phase-1",
    projectId: "proj-1",
    projectLabel: "R-042 — Kitchen remodel",
    phaseTitle: "Demolition",
    plannedEnd: "2026-07-14",
    now,
  }

  it("builds a requiresAck in-app error alert to the routed recipient", () => {
    const row = buildMilestoneMissedAlert(base)
    expect(row.userId).toBe("user-1")
    expect(row.companyId).toBe("co-1")
    expect(row.type).toBe("error")
    expect(row.channel).toBe("in_app")
    expect(row.requiresAck).toBe(true)
    expect(row.entityType).toBe("renovation_phase")
    expect(row.entityId).toBe("phase-1")
    expect(row.actionUrl).toBe("/renovation/proj-1")
    expect(row.deliveredAt).toBe(now)
  })

  it("names the project in the title and the phase + overdue days in the body", () => {
    const row = buildMilestoneMissedAlert(base)
    expect(row.title).toContain("R-042 — Kitchen remodel")
    expect(row.body).toContain("Demolition")
    expect(row.body).toContain("2026-07-14")
    expect(row.body).toContain("7 zile")
  })

  it("uses the singular 'zi' at exactly one day overdue", () => {
    const row = buildMilestoneMissedAlert({ ...base, plannedEnd: "2026-07-20" })
    expect(row.body).toContain("1 zi")
    expect(row.body).not.toContain("1 zile")
  })

  it("carries the trigger key and overdue math in metadata", () => {
    const row = buildMilestoneMissedAlert(base)
    expect(row.metadata["triggerKey"]).toBe(MILESTONE_MISSED_TRIGGER)
    expect(row.metadata["triggerKey"]).toBe("ops.milestone_missed")
    expect(row.metadata["daysOverdue"]).toBe(7)
    expect(row.metadata["plannedEnd"]).toBe("2026-07-14")
  })

  it("truncates an overlong title to 500 chars", () => {
    const row = buildMilestoneMissedAlert({ ...base, projectLabel: "X".repeat(600) })
    expect(row.title.length).toBe(500)
  })
})
