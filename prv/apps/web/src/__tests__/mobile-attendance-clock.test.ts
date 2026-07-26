import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/mobile/auth", () => ({
  withMobileAuth: (handler: unknown) => handler,
}))

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn(),
}))

const mockDb = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: "att-1" }]),
}

vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => ({ attendanceRecords: {} }))

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn() }
})

const ctx = { companyId: "company-1", userId: "user-1", sessionId: "session-1" }

function makeReq(body: unknown): NextRequest {
  return {
    method: "POST",
    nextUrl: { pathname: "/api/mobile/attendance/clock" },
    headers: { get: () => null },
    json: async () => body,
  } as unknown as NextRequest
}

const RETURNED = {
  id: "att-1",
  date: "2026-07-26",
  status: "present",
  clockIn: new Date("2026-07-26T05:00:00Z"),
  clockOut: null,
  lateMinutes: null,
}

function resetMocks() {
  vi.resetAllMocks()
  mockDb.select.mockReturnThis()
  mockDb.insert.mockReturnThis()
  mockDb.update.mockReturnThis()
  mockDb.from.mockReturnThis()
  mockDb.where.mockReturnThis()
  mockDb.set.mockReturnThis()
  mockDb.values.mockReturnThis()
  mockDb.returning.mockResolvedValue([RETURNED])
}

describe("POST /api/mobile/attendance/clock — clock in", () => {
  beforeEach(resetMocks)

  it("creates today's record on first clock-in (201) and audits it", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([]) // no record today

    const { POST } = await import("@/app/api/mobile/attendance/clock/route")
    const res = await POST(makeReq({ action: "in" }), ctx)
    expect(res.status).toBe(201)
    expect(mockDb.insert).toHaveBeenCalled()
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "attendance.clock_in", actorId: "user-1" })
    )
  })

  it("fills the existing (e.g. shift-seeded) record instead of inserting a duplicate", async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: "att-1", status: "absent", clockIn: null, clockOut: null, scheduledStart: "08:00" },
    ])

    const { POST } = await import("@/app/api/mobile/attendance/clock/route")
    const res = await POST(makeReq({ action: "in" }), ctx)
    expect(res.status).toBe(200)
    expect(mockDb.update).toHaveBeenCalled()
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it("rejects a second clock-in (409 ALREADY_CLOCKED_IN)", async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: "att-1", status: "present", clockIn: new Date(), clockOut: null },
    ])

    const { POST } = await import("@/app/api/mobile/attendance/clock/route")
    const res = await POST(makeReq({ action: "in" }), ctx)
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe("ALREADY_CLOCKED_IN")
    expect(mockDb.update).not.toHaveBeenCalled()
  })

  it("refuses to clock in over an approved leave day (409 ON_LEAVE)", async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: "att-1", status: "leave", clockIn: null, clockOut: null },
    ])

    const { POST } = await import("@/app/api/mobile/attendance/clock/route")
    const res = await POST(makeReq({ action: "in" }), ctx)
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe("ON_LEAVE")
  })
})

describe("POST /api/mobile/attendance/clock — clock out", () => {
  beforeEach(resetMocks)

  it("rejects clock-out without a clock-in (409 NOT_CLOCKED_IN)", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { POST } = await import("@/app/api/mobile/attendance/clock/route")
    const res = await POST(makeReq({ action: "out" }), ctx)
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe("NOT_CLOCKED_IN")
  })

  it("closes the day (status clocked_out) and audits it", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([
      { id: "att-1", status: "present", clockIn: new Date(), clockOut: null },
    ])
    mockDb.returning.mockResolvedValueOnce([{ ...RETURNED, status: "clocked_out" }])

    const { POST } = await import("@/app/api/mobile/attendance/clock/route")
    const res = await POST(makeReq({ action: "out" }), ctx)
    expect(res.status).toBe(200)
    expect((await res.json()).status).toBe("clocked_out")
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "attendance.clock_out" })
    )
  })

  it("rejects a double clock-out (409 ALREADY_CLOCKED_OUT)", async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: "att-1", status: "clocked_out", clockIn: new Date(), clockOut: new Date() },
    ])

    const { POST } = await import("@/app/api/mobile/attendance/clock/route")
    const res = await POST(makeReq({ action: "out" }), ctx)
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe("ALREADY_CLOCKED_OUT")
  })

  it("returns 422 for an unknown action", async () => {
    const { POST } = await import("@/app/api/mobile/attendance/clock/route")
    const res = await POST(makeReq({ action: "pause" }), ctx)
    expect(res.status).toBe(422)
  })
})
