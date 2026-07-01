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
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const mod: Record<string, unknown> = {}
  for (const t of ["projects", "projectTasks", "users"]) mod[t] = col()
  return mod
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn(), asc: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "user-1", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
const PROJECT = "proj-1"
const TASK = "task-1"
function listReq(qs = "") {
  return {
    method: "GET",
    nextUrl: { pathname: `/api/projects/${PROJECT}/tasks`, searchParams: new URLSearchParams(qs) },
    url: `http://localhost/api/projects/${PROJECT}/tasks`,
    headers: { get: () => null },
  } as unknown as Request
}
function postReq(body: unknown) {
  return {
    method: "POST",
    nextUrl: { pathname: `/api/projects/${PROJECT}/tasks`, searchParams: new URLSearchParams() },
    url: `http://localhost/api/projects/${PROJECT}/tasks`,
    json: async () => body,
    headers: { get: () => null },
  } as unknown as Request
}
function patchReq(body: unknown) {
  return {
    method: "PATCH",
    nextUrl: {
      pathname: `/api/projects/${PROJECT}/tasks/${TASK}`,
      searchParams: new URLSearchParams(),
    },
    url: `http://localhost/api/projects/${PROJECT}/tasks/${TASK}`,
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
    "where",
    "orderBy",
    "limit",
    "insert",
    "values",
    "returning",
    "update",
    "set",
    "delete",
  ] as const)
    mockDb[m].mockReturnThis()
}

describe("/api/projects/[id]/tasks", () => {
  beforeEach(reset)

  it("GET returns tasks with assignee name + numeric hours", async () => {
    queue.push([{ id: PROJECT }]) // verifyProject
    queue.push([
      {
        id: "t1",
        title: "Install cabinets",
        description: null,
        status: "todo",
        priority: "high",
        assigneeId: "u1",
        dueDate: null,
        estimatedHours: "16.00",
        actualHours: null,
        parentTaskId: null,
        dependsOnTaskId: "t0",
        orderIndex: 0,
        tags: [],
        startedAt: null,
        completedAt: null,
        firstName: "Andrei",
        lastName: "Dinu",
      },
    ])
    const { GET } = await import("@/app/api/projects/[id]/tasks/route")
    const res = await GET(listReq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tasks[0]).toMatchObject({
      title: "Install cabinets",
      assigneeName: "Andrei Dinu",
      estimatedHours: 16,
      dependsOnTaskId: "t0",
    })
  })

  it("POST creates a task and audit-logs it", async () => {
    queue.push([{ id: PROJECT }]) // verifyProject
    queue.push([{ id: "new-task" }]) // insert returning
    const { POST } = await import("@/app/api/projects/[id]/tasks/route")
    const res = await POST(postReq({ title: "New task", priority: "medium" }), ctx)
    expect(res.status).toBe(201)
    expect(auditSpy).toHaveBeenCalledTimes(1)
  })

  it("POST rejects an empty title with 422", async () => {
    queue.push([{ id: PROJECT }]) // verifyProject
    const { POST } = await import("@/app/api/projects/[id]/tasks/route")
    const res = await POST(postReq({ title: "" }), ctx)
    expect(res.status).toBe(422)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it("PATCH refuses to start a task blocked by an unfinished dependency (409)", async () => {
    queue.push([{ id: PROJECT }]) // verifyProject
    queue.push([{ id: TASK, status: "todo", startedAt: null, dependsOnTaskId: "blocker" }]) // current
    queue.push([{ status: "in_progress" }]) // blocker status (not done)
    const { PATCH } = await import("@/app/api/projects/[id]/tasks/[taskId]/route")
    const res = await PATCH(patchReq({ status: "in_progress" }), ctx)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe("TASK_BLOCKED")
    expect(mockDb.update).not.toHaveBeenCalled()
  })

  it("PATCH allows the move once the dependency is done", async () => {
    queue.push([{ id: PROJECT }]) // verifyProject
    queue.push([{ id: TASK, status: "todo", startedAt: null, dependsOnTaskId: "blocker" }]) // current
    queue.push([{ status: "done" }]) // blocker status = done
    queue.push([{ id: TASK, status: "in_progress" }]) // update returning
    const { PATCH } = await import("@/app/api/projects/[id]/tasks/[taskId]/route")
    const res = await PATCH(patchReq({ status: "in_progress" }), ctx)
    expect(res.status).toBe(200)
    expect(mockDb.update).toHaveBeenCalledTimes(1)
    expect(auditSpy).toHaveBeenCalledTimes(1)
  })

  it("PATCH moving an unblocked task to done skips the dependency check", async () => {
    queue.push([{ id: PROJECT }]) // verifyProject
    queue.push([{ id: TASK, status: "review", startedAt: new Date(), dependsOnTaskId: null }]) // current
    queue.push([{ id: TASK, status: "done" }]) // update returning
    const { PATCH } = await import("@/app/api/projects/[id]/tasks/[taskId]/route")
    const res = await PATCH(patchReq({ status: "done" }), ctx)
    expect(res.status).toBe(200)
    expect(mockDb.update).toHaveBeenCalledTimes(1)
  })
})
