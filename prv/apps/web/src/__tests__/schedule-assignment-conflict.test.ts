import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))
const auditSpy = vi.fn().mockResolvedValue(undefined)
vi.mock("@prv/auth", () => ({ writeAuditLog: auditSpy, RoleSets: { admin: [] } }))

const queue: unknown[][] = []
const nextResult = () => (queue.length ? (queue.shift() ?? []) : [])
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoNothing: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const mod: Record<string, unknown> = {}
  for (const t of ["shiftAssignments", "shifts", "users"]) mod[t] = col()
  return mod
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn(), isNull: vi.fn(), ne: vi.fn(), asc: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "actor-1", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
const SHIFT = "shift-1"
function postReq(body: unknown) {
  return {
    method: "POST",
    nextUrl: {
      pathname: `/api/schedule/${SHIFT}/assignments`,
      searchParams: new URLSearchParams(),
    },
    url: `http://localhost/api/schedule/${SHIFT}/assignments`,
    json: async () => body,
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of [
    "select",
    "from",
    "leftJoin",
    "innerJoin",
    "where",
    "limit",
    "orderBy",
    "insert",
    "values",
    "onConflictDoNothing",
    "returning",
  ] as const)
    mockDb[m].mockReturnThis()
}

const shiftRow = {
  id: SHIFT,
  companyId: "company-1",
  date: "2026-07-02",
  startTime: "08:00",
  endTime: "16:00",
  status: "draft",
  totalSlots: null,
  deletedAt: null,
}
const USER = "11111111-1111-1111-1111-111111111111"

describe("POST /api/schedule/[id]/assignments — conflict detection", () => {
  beforeEach(reset)

  it("rejects a double-booking overlap with 409 SHIFT_CONFLICT", async () => {
    queue.push([shiftRow]) // resolveShift
    queue.push([{ id: USER }]) // member
    queue.push([{ cnt: 0 }]) // capacity
    queue.push([{ id: "other", title: "Evening", startTime: "12:00", endTime: "20:00" }]) // same-day overlapping
    const { POST } = await import("@/app/api/schedule/[id]/assignments/route")
    const res = await POST(postReq({ userId: USER }), ctx)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe("SHIFT_CONFLICT")
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it("allows assignment when same-day shifts don't overlap", async () => {
    queue.push([shiftRow])
    queue.push([{ id: USER }])
    queue.push([{ cnt: 0 }])
    queue.push([{ id: "other", title: "Late", startTime: "16:00", endTime: "22:00" }]) // touches, no overlap
    queue.push([{ id: "asg-1" }]) // insert
    const { POST } = await import("@/app/api/schedule/[id]/assignments/route")
    const res = await POST(postReq({ userId: USER }), ctx)
    expect(res.status).toBe(201)
    expect(mockDb.insert).toHaveBeenCalledTimes(1)
  })

  it("allows assignment when the employee has no other shift that day", async () => {
    queue.push([shiftRow])
    queue.push([{ id: USER }])
    queue.push([{ cnt: 0 }])
    queue.push([]) // no same-day shifts
    queue.push([{ id: "asg-2" }])
    const { POST } = await import("@/app/api/schedule/[id]/assignments/route")
    const res = await POST(postReq({ userId: USER }), ctx)
    expect(res.status).toBe(201)
    expect(auditSpy).toHaveBeenCalledTimes(1)
  })
})
