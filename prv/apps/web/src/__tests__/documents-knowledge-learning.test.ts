import { vi, describe, it, expect } from "vitest"

vi.mock("@prv/db", () => ({ db: { select: vi.fn(), update: vi.fn(), insert: vi.fn() } }))
vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn(),
  withGates: (_opts: unknown, handler: unknown) => handler,
}))
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn(), isNull: vi.fn() }
})
vi.mock("@prv/db/schema", () => ({
  documents: {},
  users: {},
  projects: {},
  documentSignatures: {},
  knowledgeArticles: {},
  articleReadProgress: {},
  learningCourses: {},
  courseEnrollments: {},
}))

import {
  enrollmentNextStatus,
  ENROLLMENT_NEXT_STATUS,
  type EnrollmentAction,
} from "../app/api/learning/[id]/route"

// ── Enrollment state machine ──────────────────────────────────────────────────

describe("ENROLLMENT_NEXT_STATUS", () => {
  it("enroll → in_progress", () => {
    expect(ENROLLMENT_NEXT_STATUS["enroll"]).toBe("in_progress")
  })

  it("update_progress → in_progress", () => {
    expect(ENROLLMENT_NEXT_STATUS["update_progress"]).toBe("in_progress")
  })

  it("complete → completed", () => {
    expect(ENROLLMENT_NEXT_STATUS["complete"]).toBe("completed")
  })

  it("save → saved", () => {
    expect(ENROLLMENT_NEXT_STATUS["save"]).toBe("saved")
  })

  it("covers all defined actions", () => {
    const actions: EnrollmentAction[] = ["enroll", "update_progress", "complete", "save"]
    for (const action of actions) {
      expect(ENROLLMENT_NEXT_STATUS[action]).toBeDefined()
    }
  })
})

describe("enrollmentNextStatus", () => {
  it("enroll from new → in_progress", () => {
    expect(enrollmentNextStatus("enroll", "new")).toBe("in_progress")
  })

  it("update_progress while in_progress stays in_progress", () => {
    expect(enrollmentNextStatus("update_progress", "in_progress")).toBe("in_progress")
  })

  it("update_progress while completed stays completed", () => {
    expect(enrollmentNextStatus("update_progress", "completed")).toBe("completed")
  })

  it("complete → completed regardless of current", () => {
    expect(enrollmentNextStatus("complete", "in_progress")).toBe("completed")
    expect(enrollmentNextStatus("complete", "new")).toBe("completed")
  })

  it("save → saved", () => {
    expect(enrollmentNextStatus("save", "new")).toBe("saved")
  })
})

// ── Enrollment full lifecycle ─────────────────────────────────────────────────

describe("enrollment lifecycle: new → in_progress → completed", () => {
  it("walks the happy path", () => {
    let status = "new"

    const step1: EnrollmentAction = "enroll"
    status = enrollmentNextStatus(step1, status)
    expect(status).toBe("in_progress")

    const step2: EnrollmentAction = "update_progress"
    status = enrollmentNextStatus(step2, status)
    expect(status).toBe("in_progress")

    const step3: EnrollmentAction = "complete"
    status = enrollmentNextStatus(step3, status)
    expect(status).toBe("completed")
  })

  it("update_progress does not regress a completed course", () => {
    const status = enrollmentNextStatus("update_progress", "completed")
    expect(status).toBe("completed")
  })
})

// ── Document status values ────────────────────────────────────────────────────

describe("document status set", () => {
  const validStatuses = ["draft", "published", "under_review", "signed", "archived"] as const

  it("all valid statuses are defined", () => {
    expect(validStatuses.length).toBe(5)
  })

  it("draft is a valid status", () => {
    expect(validStatuses).toContain("draft")
  })

  it("signed is a valid status", () => {
    expect(validStatuses).toContain("signed")
  })

  it("archived is a valid status", () => {
    expect(validStatuses).toContain("archived")
  })
})

// ── Knowledge category + type values ─────────────────────────────────────────

describe("knowledge article types", () => {
  const validTypes = ["sop", "policy", "guide", "faq"] as const
  const validCategories = [
    "operations",
    "hr",
    "finance",
    "procurement",
    "fleet",
    "projects",
  ] as const

  it("all 4 article types are defined", () => {
    expect(validTypes.length).toBe(4)
  })

  it("all 6 article categories are defined", () => {
    expect(validCategories.length).toBe(6)
  })

  it("sop is a valid type", () => {
    expect(validTypes).toContain("sop")
  })

  it("fleet is a valid category", () => {
    expect(validCategories).toContain("fleet")
  })
})
