import { vi, describe, it, expect } from "vitest"

vi.mock("@prv/db", () => ({ db: { select: vi.fn(), update: vi.fn(), insert: vi.fn() } }))
vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn(),
  withGates: (_opts: unknown, handler: unknown) => handler,
}))
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn() }
})
vi.mock("@prv/db/schema", () => ({ payrollRuns: {} }))

import {
  isValidPayrollTransition,
  PAYROLL_REQUIRED_STATUS,
  PAYROLL_NEXT_STATUS,
  type PayrollAction,
} from "../app/api/payroll/[id]/route"

// ── Payroll transition state machine ─────────────────────────────────────────

describe("isValidPayrollTransition", () => {
  it("allows start_processing when status is pending", () => {
    expect(isValidPayrollTransition("start_processing", "pending")).toBe(true)
  })

  it("rejects start_processing when status is processing", () => {
    expect(isValidPayrollTransition("start_processing", "processing")).toBe(false)
  })

  it("rejects start_processing when status is done", () => {
    expect(isValidPayrollTransition("start_processing", "done")).toBe(false)
  })

  it("allows mark_done when status is processing", () => {
    expect(isValidPayrollTransition("mark_done", "processing")).toBe(true)
  })

  it("rejects mark_done when status is pending", () => {
    expect(isValidPayrollTransition("mark_done", "pending")).toBe(false)
  })

  it("rejects mark_done when status is done", () => {
    expect(isValidPayrollTransition("mark_done", "done")).toBe(false)
  })
})

describe("PAYROLL_REQUIRED_STATUS", () => {
  it("start_processing requires pending", () => {
    expect(PAYROLL_REQUIRED_STATUS["start_processing"]).toBe("pending")
  })

  it("mark_done requires processing", () => {
    expect(PAYROLL_REQUIRED_STATUS["mark_done"]).toBe("processing")
  })
})

describe("PAYROLL_NEXT_STATUS", () => {
  it("start_processing transitions to processing", () => {
    expect(PAYROLL_NEXT_STATUS["start_processing"]).toBe("processing")
  })

  it("mark_done transitions to done", () => {
    expect(PAYROLL_NEXT_STATUS["mark_done"]).toBe("done")
  })

  it("covers all defined actions", () => {
    const actions: PayrollAction[] = ["start_processing", "mark_done"]
    for (const action of actions) {
      expect(PAYROLL_NEXT_STATUS[action]).toBeDefined()
    }
  })
})

// ── Payroll full cycle ────────────────────────────────────────────────────────

describe("payroll lifecycle: pending → processing → done", () => {
  it("cannot skip steps: pending does not accept mark_done", () => {
    expect(isValidPayrollTransition("mark_done", "pending")).toBe(false)
  })

  it("each step produces the expected next status", () => {
    let status = "pending"

    const step1: PayrollAction = "start_processing"
    expect(isValidPayrollTransition(step1, status)).toBe(true)
    status = PAYROLL_NEXT_STATUS[step1]
    expect(status).toBe("processing")

    const step2: PayrollAction = "mark_done"
    expect(isValidPayrollTransition(step2, status)).toBe(true)
    status = PAYROLL_NEXT_STATUS[step2]
    expect(status).toBe("done")
  })
})
