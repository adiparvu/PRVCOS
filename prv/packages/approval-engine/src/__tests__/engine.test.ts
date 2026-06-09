import { vi, describe, it, expect, beforeEach } from "vitest"

// ── DB mock ───────────────────────────────────────────────────────────────────
// Three separate chains so insert / update / select don't share mock fns.

const mockInsertReturning = vi.fn()
const mockInsertValues = vi.fn()

const mockUpdateReturning = vi.fn()
const mockUpdateWhere = vi.fn()
const mockUpdateSet = vi.fn()

const mockSelectLimit = vi.fn()
const mockSelectWhere = vi.fn()
const mockSelectFrom = vi.fn()

vi.mock("@prv/db", () => ({
  db: {
    insert: vi.fn(() => ({ values: mockInsertValues })),
    update: vi.fn(() => ({ set: mockUpdateSet })),
    select: vi.fn(() => ({ from: mockSelectFrom })),
  },
}))

vi.mock("@prv/db/schema", () => ({ approvalRequests: {} }))
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col, val) => ({ eq: val })),
  and: vi.fn((...args) => ({ and: args })),
  inArray: vi.fn((_col, vals) => ({ inArray: vals })),
  lt: vi.fn((_col, val) => ({ lt: val })),
}))

beforeEach(() => {
  vi.clearAllMocks()
  // Insert chain: db.insert().values().returning()
  mockInsertValues.mockReturnValue({ returning: mockInsertReturning })
  // Update chain: db.update().set().where().returning()
  mockUpdateSet.mockReturnValue({ where: mockUpdateWhere })
  mockUpdateWhere.mockReturnValue({ returning: mockUpdateReturning })
  // Select chain: db.select().from().where().limit()
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere })
  mockSelectWhere.mockReturnValue({ limit: mockSelectLimit })
})

import {
  validateApprovalRequest,
  deadlineFromSlaHours,
  isOverdue,
  submitForApproval,
  processApproval,
  escalateApproval,
  delegateApproval,
  getApprovalStatus,
  markExpiredApprovals,
  ApprovalNotFoundError,
} from "../index"

// ── Pure logic tests ──────────────────────────────────────────────────────────

describe("validateApprovalRequest", () => {
  const BASE = {
    companyId: "c1",
    requestedByUserId: "u1",
    type: "purchase" as const,
    title: "Buy lumber",
    ref: "PO-001",
    deadline: new Date(Date.now() + 86_400_000),
  }

  it("returns no errors for a valid request", () => {
    expect(validateApprovalRequest(BASE)).toHaveLength(0)
  })

  it("requires companyId", () => {
    expect(validateApprovalRequest({ ...BASE, companyId: "" })).toContain("companyId is required")
  })

  it("requires title", () => {
    expect(validateApprovalRequest({ ...BASE, title: "   " })).toContain("title is required")
  })

  it("requires ref", () => {
    expect(validateApprovalRequest({ ...BASE, ref: "" })).toContain("ref is required")
  })

  it("rejects past deadlines", () => {
    const past = new Date(Date.now() - 1000)
    expect(validateApprovalRequest({ ...BASE, deadline: past })).toContain(
      "deadline must be in the future"
    )
  })

  it("rejects negative values", () => {
    expect(validateApprovalRequest({ ...BASE, value: -1 })).toContain(
      "value must be a non-negative number"
    )
  })

  it("allows value of 0", () => {
    expect(validateApprovalRequest({ ...BASE, value: 0 })).toHaveLength(0)
  })

  it("accumulates multiple errors", () => {
    const errors = validateApprovalRequest({
      companyId: "",
      requestedByUserId: "",
      type: "leave",
      title: "",
      ref: "",
      deadline: new Date(Date.now() - 1000),
    })
    expect(errors.length).toBeGreaterThan(1)
  })
})

describe("deadlineFromSlaHours", () => {
  it("computes deadline correctly for 24h SLA", () => {
    const from = new Date("2025-01-01T00:00:00Z")
    const result = deadlineFromSlaHours(24, from)
    expect(result.getTime()).toBe(new Date("2025-01-02T00:00:00Z").getTime())
  })

  it("handles sub-hour SLA", () => {
    const from = new Date("2025-01-01T00:00:00Z")
    const result = deadlineFromSlaHours(0.5, from)
    expect(result.getTime()).toBe(new Date("2025-01-01T00:30:00Z").getTime())
  })

  it("uses current time when `from` is omitted", () => {
    const before = Date.now()
    const result = deadlineFromSlaHours(1)
    const after = Date.now()
    expect(result.getTime()).toBeGreaterThanOrEqual(before + 3_600_000)
    expect(result.getTime()).toBeLessThanOrEqual(after + 3_600_000)
  })
})

describe("isOverdue", () => {
  it("returns true when deadline has passed", () => {
    expect(isOverdue(new Date(Date.now() - 1000))).toBe(true)
  })

  it("returns false when deadline is in the future", () => {
    expect(isOverdue(new Date(Date.now() + 3_600_000))).toBe(false)
  })

  it("accepts a custom `now` for deterministic tests", () => {
    const deadline = new Date("2025-06-01T00:00:00Z")
    expect(isOverdue(deadline, new Date("2025-05-31T00:00:00Z"))).toBe(false)
    expect(isOverdue(deadline, new Date("2025-06-02T00:00:00Z"))).toBe(true)
  })
})

// ── submitForApproval ─────────────────────────────────────────────────────────

describe("submitForApproval", () => {
  it("inserts a record and returns the new ID", async () => {
    mockInsertReturning.mockResolvedValue([{ id: "new-approval-id" }])

    const id = await submitForApproval({
      companyId: "c1",
      requestedByUserId: "u1",
      type: "purchase",
      title: "Buy lumber",
      ref: "PO-001",
      deadline: new Date(Date.now() + 86_400_000),
    })

    expect(id).toBe("new-approval-id")
    expect(mockInsertValues).toHaveBeenCalledOnce()
    expect(mockInsertReturning).toHaveBeenCalledOnce()
  })

  it("throws if DB returns no row", async () => {
    mockInsertReturning.mockResolvedValue([])

    await expect(
      submitForApproval({
        companyId: "c1",
        requestedByUserId: "u1",
        type: "leave",
        title: "Leave request",
        ref: "LV-001",
        deadline: new Date(Date.now() + 86_400_000),
      })
    ).rejects.toThrow("Database insert failed")
  })

  it("throws if validation fails before hitting the DB", async () => {
    await expect(
      submitForApproval({
        companyId: "",
        requestedByUserId: "u1",
        type: "expense",
        title: "Expense",
        ref: "EX-001",
        deadline: new Date(Date.now() + 86_400_000),
      })
    ).rejects.toThrow("Invalid approval request")

    expect(mockInsertValues).not.toHaveBeenCalled()
  })
})

// ── processApproval ───────────────────────────────────────────────────────────

describe("processApproval", () => {
  it("sets status to 'approved' and resolves successfully", async () => {
    mockUpdateReturning.mockResolvedValue([{ id: "a1" }])

    await expect(
      processApproval({
        approvalId: "a1",
        decision: "approved",
        decidedBy: "manager-id",
        decidedAt: new Date(),
      })
    ).resolves.toBeUndefined()

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved", approvedByUserId: "manager-id" })
    )
  })

  it("sets status to 'rejected'", async () => {
    mockUpdateReturning.mockResolvedValue([{ id: "a1" }])

    await processApproval({
      approvalId: "a1",
      decision: "rejected",
      decidedBy: "manager-id",
      decidedAt: new Date(),
    })

    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ status: "rejected" }))
  })

  it("throws ApprovalNotFoundError when approval is not in actionable state", async () => {
    mockUpdateReturning.mockResolvedValue([])

    await expect(
      processApproval({
        approvalId: "missing-id",
        decision: "rejected",
        decidedBy: "manager-id",
        decidedAt: new Date(),
      })
    ).rejects.toThrow(ApprovalNotFoundError)
  })
})

// ── escalateApproval ──────────────────────────────────────────────────────────

describe("escalateApproval", () => {
  it("sets status to 'urgent'", async () => {
    mockUpdateReturning.mockResolvedValue([])

    await escalateApproval("a1")

    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ status: "urgent" }))
  })
})

// ── delegateApproval ──────────────────────────────────────────────────────────

describe("delegateApproval", () => {
  it("updates approvedByUserId to the delegate", async () => {
    mockUpdateReturning.mockResolvedValue([{ id: "a1" }])

    await delegateApproval("a1", "delegate-user-id")

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ approvedByUserId: "delegate-user-id" })
    )
  })

  it("throws ApprovalNotFoundError when approval is already resolved", async () => {
    mockUpdateReturning.mockResolvedValue([])

    await expect(delegateApproval("resolved-id", "u2")).rejects.toThrow(ApprovalNotFoundError)
  })
})

// ── getApprovalStatus ─────────────────────────────────────────────────────────

describe("getApprovalStatus", () => {
  it("maps DB 'urgent' to engine status 'escalated'", async () => {
    mockSelectLimit.mockResolvedValue([{ status: "urgent" }])

    expect(await getApprovalStatus("a1")).toBe("escalated")
  })

  it("returns 'pending' for pending approvals", async () => {
    mockSelectLimit.mockResolvedValue([{ status: "pending" }])

    expect(await getApprovalStatus("a1")).toBe("pending")
  })

  it("returns 'approved' for resolved approvals", async () => {
    mockSelectLimit.mockResolvedValue([{ status: "approved" }])

    expect(await getApprovalStatus("a1")).toBe("approved")
  })

  it("returns null when approval not found", async () => {
    mockSelectLimit.mockResolvedValue([])

    expect(await getApprovalStatus("unknown")).toBeNull()
  })
})

// ── markExpiredApprovals ──────────────────────────────────────────────────────

describe("markExpiredApprovals", () => {
  it("returns count of records marked expired", async () => {
    mockUpdateReturning.mockResolvedValue([{ id: "a1" }, { id: "a2" }])

    expect(await markExpiredApprovals()).toBe(2)
  })

  it("returns 0 when nothing to expire", async () => {
    mockUpdateReturning.mockResolvedValue([])

    expect(await markExpiredApprovals()).toBe(0)
  })

  it("passes companyId filter when provided", async () => {
    mockUpdateReturning.mockResolvedValue([{ id: "a1" }])

    const count = await markExpiredApprovals("company-xyz")
    expect(count).toBe(1)
    // eq is mocked — verify it was called with the companyId value
    const { eq } = await import("drizzle-orm")
    expect(eq).toHaveBeenCalledWith(undefined, "company-xyz")
  })
})
