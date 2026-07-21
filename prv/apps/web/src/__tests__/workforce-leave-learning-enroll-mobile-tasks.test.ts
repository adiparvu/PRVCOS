import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))

vi.mock("@/lib/mobile/auth", () => ({
  withMobileAuth: (handler: unknown) => handler,
}))

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn(),
}))

const mockDb = {
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  set: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: "item-1" }]),
  values: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockResolvedValue([]),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => ({
  leaveRequests: {},
  learningCourses: {},
  courseEnrollments: {},
  projectMilestones: {},
  projects: {},
  users: {},
}))

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    isNull: vi.fn(),
    asc: vi.fn(),
    desc: vi.fn(),
    inArray: vi.fn(),
  }
})

const webCtx = {
  session: { companyId: "company-1", userId: "user-1", sessionId: "session-1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}

const mobileCtx = { companyId: "company-1", userId: "user-1" }

function makeReq(path: string, method = "GET", overrides: Record<string, unknown> = {}): Request {
  return {
    method,
    nextUrl: { pathname: path, searchParams: new URLSearchParams() },
    headers: { get: () => null },
    json: async () => ({}),
    ...overrides,
  } as unknown as Request
}

function resetMocks() {
  vi.resetAllMocks()
  mockDb.select.mockReturnThis()
  mockDb.update.mockReturnThis()
  mockDb.insert.mockReturnThis()
  mockDb.delete.mockReturnThis()
  mockDb.from.mockReturnThis()
  mockDb.where.mockReturnThis()
  mockDb.limit.mockReset()
  mockDb.limit.mockResolvedValue([])
  mockDb.set.mockReturnThis()
  mockDb.leftJoin.mockReturnThis()
  mockDb.innerJoin.mockReturnThis()
  mockDb.returning.mockReset()
  mockDb.returning.mockResolvedValue([{ id: "item-1" }])
  mockDb.values.mockReturnThis()
  mockDb.orderBy.mockReset()
  mockDb.orderBy.mockResolvedValue([])
  mockDb.onConflictDoUpdate.mockReturnThis()
}

// ─── GET /api/workforce/leave/[id] ────────────────────────────────────────────

describe("GET /api/workforce/leave/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when leave request not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { GET } = await import("@/app/api/workforce/leave/[id]/route")
    const res = await GET(makeReq("/api/workforce/leave/leave-1", "GET"), webCtx)
    expect(res.status).toBe(404)
  })

  it("returns 200 with leaveRequest when found", async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: "leave-1", status: "pending", userId: "u1", companyId: "c1" },
    ])

    const { GET } = await import("@/app/api/workforce/leave/[id]/route")
    const res = await GET(makeReq("/api/workforce/leave/leave-1", "GET"), webCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.leaveRequest).toBeDefined()
    expect(body.leaveRequest.id).toBe("leave-1")
  })
})

// ─── PATCH /api/workforce/leave/[id] ─────────────────────────────────────────

describe("PATCH /api/workforce/leave/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when leave not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { PATCH } = await import("@/app/api/workforce/leave/[id]/route")
    const res = await PATCH(
      makeReq("/api/workforce/leave/leave-1", "PATCH", {
        json: async () => ({ status: "approved" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("returns 409 when leave status is approved (not pending)", async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: "leave-1", status: "approved", userId: "u1", companyId: "c1" },
    ])

    const { PATCH } = await import("@/app/api/workforce/leave/[id]/route")
    const res = await PATCH(
      makeReq("/api/workforce/leave/leave-1", "PATCH", {
        json: async () => ({ status: "approved" }),
      }),
      webCtx
    )
    expect(res.status).toBe(409)
  })

  it("returns 422 for invalid payload (missing status)", async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: "leave-1", status: "pending", userId: "u1", companyId: "c1" },
    ])

    const { PATCH } = await import("@/app/api/workforce/leave/[id]/route")
    const res = await PATCH(
      makeReq("/api/workforce/leave/leave-1", "PATCH", {
        json: async () => ({}),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 200 with {id, status} on valid PATCH", async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: "leave-1", status: "pending", userId: "u1", companyId: "c1" },
    ])
    mockDb.returning.mockResolvedValueOnce([{ id: "leave-1", status: "approved" }])

    const { PATCH } = await import("@/app/api/workforce/leave/[id]/route")
    const res = await PATCH(
      makeReq("/api/workforce/leave/leave-1", "PATCH", {
        json: async () => ({ status: "approved" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe("leave-1")
    expect(body.status).toBe("approved")
  })

  it("calls writeAuditLog with action workforce.write", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([
      { id: "leave-1", status: "pending", userId: "u1", companyId: "c1" },
    ])

    const { PATCH } = await import("@/app/api/workforce/leave/[id]/route")
    await PATCH(
      makeReq("/api/workforce/leave/leave-1", "PATCH", {
        json: async () => ({ status: "approved" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "workforce.write" })
    )
  })
})

// ─── DELETE /api/workforce/leave/[id] ────────────────────────────────────────

describe("DELETE /api/workforce/leave/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when leave not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { DELETE } = await import("@/app/api/workforce/leave/[id]/route")
    const res = await DELETE(makeReq("/api/workforce/leave/leave-1", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("returns 409 when leave status is approved", async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: "leave-1", status: "approved", userId: "u1", companyId: "c1" },
    ])

    const { DELETE } = await import("@/app/api/workforce/leave/[id]/route")
    const res = await DELETE(makeReq("/api/workforce/leave/leave-1", "DELETE"), webCtx)
    expect(res.status).toBe(409)
  })

  it("returns 204 on successful delete", async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: "leave-1", status: "pending", userId: "u1", companyId: "c1" },
    ])

    const { DELETE } = await import("@/app/api/workforce/leave/[id]/route")
    const res = await DELETE(makeReq("/api/workforce/leave/leave-1", "DELETE"), webCtx)
    expect(res.status).toBe(204)
  })
})

// ─── GET /api/workforce/leave ─────────────────────────────────────────────────

describe("GET /api/workforce/leave", () => {
  beforeEach(resetMocks)

  it("returns 200 with empty leaveRequests array by default", async () => {
    mockDb.orderBy.mockResolvedValueOnce([])

    const { GET } = await import("@/app/api/workforce/leave/route")
    const res = await GET(makeReq("/api/workforce/leave", "GET"), webCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.leaveRequests).toEqual([])
  })

  it("returns 200 with leaveRequests array when rows exist", async () => {
    mockDb.orderBy.mockResolvedValueOnce([{ id: "lr-1" }])

    const { GET } = await import("@/app/api/workforce/leave/route")
    const res = await GET(makeReq("/api/workforce/leave", "GET"), webCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.leaveRequests).toHaveLength(1)
    expect(body.leaveRequests[0].id).toBe("lr-1")
  })
})

// ─── POST /api/workforce/leave ────────────────────────────────────────────────

describe("POST /api/workforce/leave", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing startDate", async () => {
    const { POST } = await import("@/app/api/workforce/leave/route")
    const res = await POST(
      makeReq("/api/workforce/leave", "POST", {
        json: async () => ({ userId: "uuid-1111-2222-3333-4444", endDate: "2026-06-05" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 422 when endDate precedes startDate", async () => {
    const { POST } = await import("@/app/api/workforce/leave/route")
    const res = await POST(
      makeReq("/api/workforce/leave", "POST", {
        json: async () => ({
          userId: "00000000-1111-2222-3333-444444444444",
          startDate: "2026-06-10",
          endDate: "2026-06-05",
        }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
    expect((await res.json()).error).toMatch(/on or before/)
  })

  it("returns 201 with {id} on valid payload", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "leave-new-1" }])

    const { POST } = await import("@/app/api/workforce/leave/route")
    const res = await POST(
      makeReq("/api/workforce/leave", "POST", {
        json: async () => ({
          userId: "00000000-1111-2222-3333-444444444444",
          startDate: "2026-06-01",
          endDate: "2026-06-05",
        }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("leave-new-1")
  })

  it("calls writeAuditLog on successful POST", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.returning.mockResolvedValueOnce([{ id: "leave-new-1" }])

    const { POST } = await import("@/app/api/workforce/leave/route")
    await POST(
      makeReq("/api/workforce/leave", "POST", {
        json: async () => ({
          userId: "00000000-1111-2222-3333-444444444444",
          startDate: "2026-06-01",
          endDate: "2026-06-05",
        }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "workforce.write" })
    )
  })
})

// ─── POST /api/learning/[id]/enroll ──────────────────────────────────────────

describe("POST /api/learning/[id]/enroll", () => {
  beforeEach(resetMocks)

  it("returns 404 when course not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { POST } = await import("@/app/api/learning/[id]/enroll/route")
    const res = await POST(makeReq("/api/learning/course-1/enroll", "POST"), webCtx)
    expect(res.status).toBe(404)
  })

  it("returns 201 with {courseId, status} when course exists", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "course-1" }])

    const { POST } = await import("@/app/api/learning/[id]/enroll/route")
    const res = await POST(makeReq("/api/learning/course-1/enroll", "POST"), webCtx)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.courseId).toBe("course-1")
    expect(body.status).toBe("in_progress")
  })

  it("calls writeAuditLog with action learning.enroll", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "course-1" }])

    const { POST } = await import("@/app/api/learning/[id]/enroll/route")
    await POST(makeReq("/api/learning/course-1/enroll", "POST"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "learning.enroll" })
    )
  })
})

// ─── PATCH /api/learning/[id]/enroll ─────────────────────────────────────────

describe("PATCH /api/learning/[id]/enroll", () => {
  beforeEach(resetMocks)

  it("returns 422 for invalid progressPct (e.g. 150)", async () => {
    const { PATCH } = await import("@/app/api/learning/[id]/enroll/route")
    const res = await PATCH(
      makeReq("/api/learning/course-1/enroll", "PATCH", {
        json: async () => ({ progressPct: 150 }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when enrollment not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { PATCH } = await import("@/app/api/learning/[id]/enroll/route")
    const res = await PATCH(
      makeReq("/api/learning/course-1/enroll", "PATCH", {
        json: async () => ({ progressPct: 50 }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("returns 200 with {courseId, progressPct} on success", async () => {
    mockDb.limit.mockResolvedValueOnce([{ userId: "user-1" }])

    const { PATCH } = await import("@/app/api/learning/[id]/enroll/route")
    const res = await PATCH(
      makeReq("/api/learning/course-1/enroll", "PATCH", {
        json: async () => ({ progressPct: 50 }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.courseId).toBe("course-1")
    expect(body.progressPct).toBe(50)
  })
})

// ─── GET /api/mobile/tasks ────────────────────────────────────────────────────

describe("GET /api/mobile/tasks", () => {
  beforeEach(resetMocks)

  it("returns 200 with {tasks:[], count:0} when db returns empty array", async () => {
    mockDb.orderBy.mockReturnThis()
    mockDb.limit.mockResolvedValueOnce([])

    const { GET } = await import("@/app/api/mobile/tasks/route")
    const res = await GET(makeReq("/api/mobile/tasks", "GET"), mobileCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tasks).toEqual([])
    expect(body.count).toBe(0)
  })

  it("returns 200 with tasks when db returns rows", async () => {
    const now = new Date()
    mockDb.orderBy.mockReturnThis()
    mockDb.limit.mockResolvedValueOnce([
      {
        id: "t1",
        title: "Fix wall",
        description: null,
        dueDate: null,
        isComplete: false,
        completedAt: null,
        createdAt: now,
        projectId: "p1",
        projectName: "Building A",
        projectStatus: "active",
      },
    ])

    const { GET } = await import("@/app/api/mobile/tasks/route")
    const res = await GET(makeReq("/api/mobile/tasks", "GET"), mobileCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tasks).toHaveLength(1)
    expect(body.tasks[0].id).toBe("t1")
    expect(body.tasks[0].title).toBe("Fix wall")
    expect(body.tasks[0].project.id).toBe("p1")
    expect(body.tasks[0].project.name).toBe("Building A")
    expect(body.count).toBe(1)
  })
})
