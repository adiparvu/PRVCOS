import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/mobile/auth", () => ({
  withMobileAuth: (handler: unknown) => handler,
}))

vi.mock("@prv/jobs/client", () => ({
  inngest: { send: vi.fn().mockResolvedValue({}) },
}))

const mockDb = {
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  set: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: "item-1" }]),
  values: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockResolvedValue([]),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => ({
  learningCourses: {},
  courseEnrollments: {},
  userAchievements: {},
  users: {},
}))

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    or: vi.fn(),
    gt: vi.fn(),
    isNull: vi.fn(),
    desc: vi.fn(),
    asc: vi.fn(),
  }
})

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
  mockDb.from.mockReturnThis()
  mockDb.where.mockReturnThis()
  mockDb.limit.mockReset()
  mockDb.limit.mockResolvedValue([])
  mockDb.set.mockReturnThis()
  mockDb.leftJoin.mockReturnThis()
  mockDb.returning.mockReset()
  mockDb.returning.mockResolvedValue([{ id: "item-1" }])
  mockDb.values.mockReturnThis()
  mockDb.orderBy.mockReset()
  mockDb.orderBy.mockResolvedValue([])
  mockDb.onConflictDoUpdate.mockReturnThis()
}

// ─── GET /api/mobile/learning ─────────────────────────────────────────────────
// The route fires Promise.all with 3 queries:
//   A: .from(learningCourses).leftJoin().where().orderBy().limit(51) → terminal: limit
//   B: .from(courseEnrollments).where(and(...))                      → terminal: where
//   C: .from(userAchievements).where(and(...)).orderBy(desc(...))    → terminal: orderBy
//
// where call order:  #1 A (non-term), #2 B (terminal → []), #3 C (non-term)
// orderBy call order:#1 A (non-term), #2 C (terminal → [])
// limit call order:  #1 A (terminal → courses)

describe("GET /api/mobile/learning", () => {
  beforeEach(resetMocks)

  it("returns 200 with empty courses and meta when db returns nothing", async () => {
    mockDb.where
      .mockReturnValueOnce(mockDb)  // A: non-terminal, continue chain
      .mockResolvedValueOnce([])    // B: terminal — enrollments
    // C: falls through to default mockReturnThis → non-terminal, fine

    mockDb.orderBy
      .mockReturnValueOnce(mockDb)  // A: non-terminal, continue to limit
      .mockResolvedValueOnce([])    // C: terminal — achievements

    mockDb.limit.mockResolvedValueOnce([]) // A: terminal — courses

    const { GET } = await import("@/app/api/mobile/learning/route")
    const res = await GET(makeReq("/api/mobile/learning", "GET"), mobileCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.courses).toEqual([])
    expect(body.count).toBe(0)
    expect(body.meta).toBeDefined()
    expect(body.meta.completedCount).toBe(0)
    expect(body.meta.inProgressCount).toBe(0)
    expect(body.achievements).toEqual([])
    expect(body.nextCursor).toBeNull()
  })

  it("returns 200 with courses when db returns rows", async () => {
    const courseRow = {
      id: "course-1",
      title: "Safety Basics",
      subtitle: "Intro to workplace safety",
      category: "safety",
      totalModules: 5,
      durationMinutes: 60,
      hasCert: true,
      isFeatured: false,
      rating: 4,
      reviewCount: 10,
      updatedAt: new Date("2025-01-15"),
      instructorFirstName: "Ana",
      instructorLastName: "Pop",
    }

    mockDb.where
      .mockReturnValueOnce(mockDb)  // A: non-terminal
      .mockResolvedValueOnce([])    // B: terminal — no enrollments
    // C: non-terminal via default

    mockDb.orderBy
      .mockReturnValueOnce(mockDb)  // A: non-terminal
      .mockResolvedValueOnce([])    // C: terminal — no achievements

    mockDb.limit.mockResolvedValueOnce([courseRow]) // A: terminal — one course

    const { GET } = await import("@/app/api/mobile/learning/route")
    const res = await GET(makeReq("/api/mobile/learning", "GET"), mobileCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.courses).toHaveLength(1)
    expect(body.courses[0].id).toBe("course-1")
    expect(body.courses[0].title).toBe("Safety Basics")
    expect(body.courses[0].status).toBe("new")
    expect(body.courses[0].progress).toBe(0)
    expect(body.courses[0].instructorName).toBe("Ana Pop")
    expect(body.count).toBe(1)
  })
})

// ─── GET /api/mobile/learning/[id] ───────────────────────────────────────────
// Promise.all with 2 queries, both terminal on limit:
//   A: .from(learningCourses).leftJoin().where(and(...)).limit(1)
//   B: .from(courseEnrollments).where(and(...)).limit(1)

describe("GET /api/mobile/learning/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when course not found", async () => {
    mockDb.limit
      .mockResolvedValueOnce([]) // A: course not found
      .mockResolvedValueOnce([]) // B: no enrollment

    const { GET } = await import("@/app/api/mobile/learning/[id]/route")
    const res = await GET(makeReq("/api/mobile/learning/course-1", "GET"), mobileCtx)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.code).toBe("NOT_FOUND")
  })

  it("returns 200 with course when found (no enrollment)", async () => {
    const courseRow = {
      id: "course-1",
      title: "Leadership 101",
      subtitle: null,
      category: "leadership",
      totalModules: 8,
      durationMinutes: 120,
      hasCert: false,
      isFeatured: true,
      rating: 5,
      reviewCount: 30,
      updatedAt: new Date("2025-03-10"),
      instructorFirstName: "Ion",
      instructorLastName: "Marin",
    }

    mockDb.limit
      .mockResolvedValueOnce([courseRow]) // A: course found
      .mockResolvedValueOnce([])           // B: no enrollment

    const { GET } = await import("@/app/api/mobile/learning/[id]/route")
    const res = await GET(makeReq("/api/mobile/learning/course-1", "GET"), mobileCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.course).toBeDefined()
    expect(body.course.id).toBe("course-1")
    expect(body.course.title).toBe("Leadership 101")
    expect(body.course.status).toBe("new")
    expect(body.course.progress).toBe(0)
    expect(body.course.instructorName).toBe("Ion Marin")
  })

  it("returns 200 with course with in-progress enrollment", async () => {
    const courseRow = {
      id: "course-2",
      title: "Finance Fundamentals",
      subtitle: "Budget and P&L",
      category: "finance",
      totalModules: 6,
      durationMinutes: 90,
      hasCert: true,
      isFeatured: false,
      rating: 4,
      reviewCount: 5,
      updatedAt: new Date("2025-05-01"),
      instructorFirstName: null,
      instructorLastName: null,
    }
    const enrollmentRow = { status: "in_progress", progressPct: 40, currentModule: 2 }

    mockDb.limit
      .mockResolvedValueOnce([courseRow])    // A: course found
      .mockResolvedValueOnce([enrollmentRow]) // B: enrollment found

    const { GET } = await import("@/app/api/mobile/learning/[id]/route")
    const res = await GET(makeReq("/api/mobile/learning/course-2", "GET"), mobileCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.course.status).toBe("in_progress")
    expect(body.course.progress).toBe(40)
    expect(body.course.currentModule).toBe(2)
    expect(body.course.instructorName).toBe("—")
  })
})

// ─── POST /api/mobile/learning/[id]/enroll ───────────────────────────────────

describe("POST /api/mobile/learning/[id]/enroll", () => {
  beforeEach(resetMocks)

  it("returns 404 when course not found", async () => {
    mockDb.limit.mockResolvedValueOnce([]) // course not found

    const { POST } = await import("@/app/api/mobile/learning/[id]/enroll/route")
    const res = await POST(makeReq("/api/mobile/learning/course-1/enroll", "POST"), mobileCtx)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.code).toBe("NOT_FOUND")
  })

  it("returns 201 with {courseId, status} when course exists", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "course-1" }]) // course found

    const { POST } = await import("@/app/api/mobile/learning/[id]/enroll/route")
    const res = await POST(makeReq("/api/mobile/learning/course-1/enroll", "POST"), mobileCtx)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.courseId).toBe("course-1")
    expect(body.status).toBe("in_progress")
  })
})

// ─── PATCH /api/mobile/learning/[id]/enroll ──────────────────────────────────

describe("PATCH /api/mobile/learning/[id]/enroll", () => {
  beforeEach(resetMocks)

  it("returns 422 for invalid progressPct (out of range)", async () => {
    const { PATCH } = await import("@/app/api/mobile/learning/[id]/enroll/route")
    const res = await PATCH(
      makeReq("/api/mobile/learning/course-1/enroll", "PATCH", {
        json: async () => ({ progressPct: 150 }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 422 for invalid JSON body", async () => {
    const { PATCH } = await import("@/app/api/mobile/learning/[id]/enroll/route")
    const res = await PATCH(
      makeReq("/api/mobile/learning/course-1/enroll", "PATCH", {
        json: async () => { throw new Error("bad json") },
      }),
      mobileCtx
    )
    expect(res.status).toBe(400)
  })

  it("returns 404 when enrollment not found", async () => {
    mockDb.limit.mockResolvedValueOnce([]) // no enrollment

    const { PATCH } = await import("@/app/api/mobile/learning/[id]/enroll/route")
    const res = await PATCH(
      makeReq("/api/mobile/learning/course-1/enroll", "PATCH", {
        json: async () => ({ progressPct: 50 }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(404)
  })

  it("returns 200 with {courseId, progressPct} on valid progress update", async () => {
    mockDb.limit.mockResolvedValueOnce([{ userId: "user-1" }]) // enrollment found

    const { PATCH } = await import("@/app/api/mobile/learning/[id]/enroll/route")
    const res = await PATCH(
      makeReq("/api/mobile/learning/course-1/enroll", "PATCH", {
        json: async () => ({ progressPct: 75 }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.courseId).toBe("course-1")
    expect(body.progressPct).toBe(75)
  })

  it("fires inngest event when progressPct is 100 (course completion)", async () => {
    const { inngest } = await import("@prv/jobs/client")

    // enrollment found, then course details for inngest event
    mockDb.limit
      .mockResolvedValueOnce([{ userId: "user-1" }])                              // enrollment check
      .mockResolvedValueOnce([{ title: "Safety Basics", category: "safety", instructorName: null }]) // course for event

    const { PATCH } = await import("@/app/api/mobile/learning/[id]/enroll/route")
    const res = await PATCH(
      makeReq("/api/mobile/learning/course-1/enroll", "PATCH", {
        json: async () => ({ progressPct: 100 }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(200)

    // Allow microtasks for the void inngest.send() call
    await new Promise((r) => setTimeout(r, 0))
    expect(inngest.send).toHaveBeenCalledWith(
      expect.objectContaining({ name: "prv/learning.course_completed" })
    )
  })
})
