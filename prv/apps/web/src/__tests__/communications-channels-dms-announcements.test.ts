import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn(),
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
  innerJoin: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: "item-1" }]),
  values: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  onConflictDoNothing: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => ({
  chatChannels: {},
  channelMembers: {},
  channelMessages: {},
  directConversations: {},
  dmParticipants: {},
  dmMessages: {},
  announcements: {},
  announcementReads: {},
  users: {},
}))

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    or: vi.fn(),
    isNull: vi.fn(),
    lt: vi.fn(),
    lte: vi.fn(),
    ilike: vi.fn(),
    desc: vi.fn(),
    asc: vi.fn(),
    sql: Object.assign(vi.fn(), { raw: vi.fn() }),
  }
})

const webCtx = {
  session: { companyId: "company-1", userId: "user-1", sessionId: "session-1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}

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
  // limit is the terminal for most select queries → resolves to []
  mockDb.limit.mockResolvedValue([])
  mockDb.set.mockReturnThis()
  mockDb.leftJoin.mockReturnThis()
  mockDb.innerJoin.mockReturnThis()
  mockDb.returning.mockResolvedValue([{ id: "item-1" }])
  mockDb.values.mockReturnThis()
  // orderBy must return this so .limit() can be chained after it
  mockDb.orderBy.mockReturnThis()
  mockDb.onConflictDoNothing.mockReturnThis()
  mockDb.onConflictDoUpdate.mockReturnThis()
}

// ─── GET /api/communications/channels ────────────────────────────────────────

describe("GET /api/communications/channels", () => {
  beforeEach(resetMocks)

  it("returns 200 with channels list", async () => {
    // Route: select.from.where.orderBy.limit — data comes from limit
    mockDb.limit.mockResolvedValueOnce([
      { id: "ch-1", name: "general", type: "public", isArchived: false },
    ])

    const { GET } = await import("@/app/api/communications/channels/route")
    const res = await GET(makeReq("/api/communications/channels"), webCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.channels)).toBe(true)
    expect(body.channels[0].name).toBe("general")
  })

  it("returns empty channels when none exist", async () => {
    // Default limit returns [] — no setup needed
    const { GET } = await import("@/app/api/communications/channels/route")
    const res = await GET(makeReq("/api/communications/channels"), webCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.channels).toHaveLength(0)
  })
})

// ─── POST /api/communications/channels ────────────────────────────────────────

describe("POST /api/communications/channels", () => {
  beforeEach(resetMocks)

  it("creates channel and returns 201", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "ch-new", name: "dev", type: "public" }])

    const { POST } = await import("@/app/api/communications/channels/route")
    const res = await POST(
      makeReq("/api/communications/channels", "POST", {
        json: async () => ({ name: "dev", type: "public" }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.channel.name).toBe("dev")
  })

  it("returns 400 for missing name", async () => {
    const { POST } = await import("@/app/api/communications/channels/route")
    const res = await POST(
      makeReq("/api/communications/channels", "POST", {
        json: async () => ({ type: "public" }),
      }),
      webCtx
    )
    expect(res.status).toBe(400)
  })
})

// ─── GET /api/communications/channels/[id]/messages ──────────────────────────

describe("GET /api/communications/channels/[id]/messages", () => {
  beforeEach(resetMocks)

  it("returns 404 when channel not found", async () => {
    // Default limit returns [] → channel not found

    const { GET } = await import("@/app/api/communications/channels/[id]/messages/route")
    const res = await GET(makeReq("/api/communications/channels/ch-1/messages"), webCtx, {
      params: { id: "ch-1" },
    })
    expect(res.status).toBe(404)
  })

  it("returns messages for a public channel", async () => {
    // Query 1: channel lookup (select.from.where.limit)
    // Query 2: messages (select.from.leftJoin.where.orderBy.limit)
    mockDb.limit
      .mockResolvedValueOnce([{ id: "ch-1", type: "public" }])
      .mockResolvedValueOnce([
        { id: "msg-1", content: "hello", type: "text", createdAt: new Date("2025-01-01") },
      ])

    const { GET } = await import("@/app/api/communications/channels/[id]/messages/route")
    const res = await GET(makeReq("/api/communications/channels/ch-1/messages"), webCtx, {
      params: { id: "ch-1" },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.messages[0].content).toBe("hello")
    expect(body.hasMore).toBe(false)
  })

  it("returns 403 for private channel when user is not a member", async () => {
    // Query 1: channel found (private)
    // Query 2: membership check → not found
    mockDb.limit.mockResolvedValueOnce([{ id: "ch-1", type: "private" }]).mockResolvedValueOnce([])

    const { GET } = await import("@/app/api/communications/channels/[id]/messages/route")
    const res = await GET(makeReq("/api/communications/channels/ch-1/messages"), webCtx, {
      params: { id: "ch-1" },
    })
    expect(res.status).toBe(403)
  })
})

// ─── POST /api/communications/channels/[id]/messages ─────────────────────────

describe("POST /api/communications/channels/[id]/messages", () => {
  beforeEach(resetMocks)

  it("returns 404 when channel not found", async () => {
    const { POST } = await import("@/app/api/communications/channels/[id]/messages/route")
    const res = await POST(
      makeReq("/api/communications/channels/ch-1/messages", "POST", {
        json: async () => ({ content: "hello" }),
      }),
      webCtx,
      { params: { id: "ch-1" } }
    )
    expect(res.status).toBe(404)
  })

  it("returns 403 when not a channel member", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "ch-1", type: "public" }]).mockResolvedValueOnce([])

    const { POST } = await import("@/app/api/communications/channels/[id]/messages/route")
    const res = await POST(
      makeReq("/api/communications/channels/ch-1/messages", "POST", {
        json: async () => ({ content: "hello" }),
      }),
      webCtx,
      { params: { id: "ch-1" } }
    )
    expect(res.status).toBe(403)
  })

  it("creates message and returns 201", async () => {
    // Query 1: channel lookup, Query 2: assertMember
    mockDb.limit
      .mockResolvedValueOnce([{ id: "ch-1", type: "public" }])
      .mockResolvedValueOnce([{ id: "member-1" }])

    mockDb.returning.mockResolvedValueOnce([
      {
        id: "msg-new",
        content: "hello",
        type: "text",
        createdAt: new Date(),
      },
    ])
    // update chatChannels.set.where → all mockReturnThis → await mockDb fine

    const { POST } = await import("@/app/api/communications/channels/[id]/messages/route")
    const res = await POST(
      makeReq("/api/communications/channels/ch-1/messages", "POST", {
        json: async () => ({ content: "hello" }),
      }),
      webCtx,
      { params: { id: "ch-1" } }
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.message.content).toBe("hello")
  })
})

// ─── GET /api/communications/dms ─────────────────────────────────────────────

describe("GET /api/communications/dms", () => {
  beforeEach(resetMocks)

  it("returns 200 with conversations list", async () => {
    // Default limit returns [] → convIds = [] → participant query skipped
    const { GET } = await import("@/app/api/communications/dms/route")
    const res = await GET(makeReq("/api/communications/dms"), webCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.conversations)).toBe(true)
  })
})

// ─── POST /api/communications/dms ────────────────────────────────────────────

describe("POST /api/communications/dms", () => {
  beforeEach(resetMocks)

  it("returns 400 for empty participantIds", async () => {
    const { POST } = await import("@/app/api/communications/dms/route")
    const res = await POST(
      makeReq("/api/communications/dms", "POST", {
        json: async () => ({ participantIds: [] }),
      }),
      webCtx
    )
    expect(res.status).toBe(400)
  })

  it("creates new DM conversation and returns 201", async () => {
    // 1:1 existing check → limit returns [] (default) → not found
    // insert conversation → returning provides new conv
    // insert participants → values.returning not called
    mockDb.returning.mockResolvedValueOnce([{ id: "conv-new" }])

    const { POST } = await import("@/app/api/communications/dms/route")
    const res = await POST(
      makeReq("/api/communications/dms", "POST", {
        json: async () => ({ participantIds: ["00000000-0000-0000-0000-000000000002"] }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.existing).toBe(false)
  })
})

// ─── GET /api/communications/dms/[id]/messages ───────────────────────────────

describe("GET /api/communications/dms/[id]/messages", () => {
  beforeEach(resetMocks)

  it("returns 404 when conversation not found", async () => {
    const { GET } = await import("@/app/api/communications/dms/[id]/messages/route")
    const res = await GET(makeReq("/api/communications/dms/conv-1/messages"), webCtx, {
      params: { id: "conv-1" },
    })
    expect(res.status).toBe(404)
  })

  it("returns 403 when user is not a participant", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "conv-1" }]).mockResolvedValueOnce([])

    const { GET } = await import("@/app/api/communications/dms/[id]/messages/route")
    const res = await GET(makeReq("/api/communications/dms/conv-1/messages"), webCtx, {
      params: { id: "conv-1" },
    })
    expect(res.status).toBe(403)
  })

  it("returns messages for a participant", async () => {
    // Query 1: conv lookup, Query 2: assertParticipant, Query 3: messages
    // update lastReadAt terminates at where → mockReturnThis fine
    mockDb.limit
      .mockResolvedValueOnce([{ id: "conv-1" }])
      .mockResolvedValueOnce([{ id: "p-1" }])
      .mockResolvedValueOnce([
        { id: "msg-1", content: "hey", type: "text", createdAt: new Date("2025-01-01") },
      ])

    const { GET } = await import("@/app/api/communications/dms/[id]/messages/route")
    const res = await GET(makeReq("/api/communications/dms/conv-1/messages"), webCtx, {
      params: { id: "conv-1" },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.messages[0].content).toBe("hey")
  })
})

// ─── POST /api/communications/dms/[id]/messages ──────────────────────────────

describe("POST /api/communications/dms/[id]/messages", () => {
  beforeEach(resetMocks)

  it("returns 403 when not a participant", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "conv-1" }]).mockResolvedValueOnce([])

    const { POST } = await import("@/app/api/communications/dms/[id]/messages/route")
    const res = await POST(
      makeReq("/api/communications/dms/conv-1/messages", "POST", {
        json: async () => ({ content: "hello" }),
      }),
      webCtx,
      { params: { id: "conv-1" } }
    )
    expect(res.status).toBe(403)
  })

  it("sends message and returns 201", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "conv-1" }]).mockResolvedValueOnce([{ id: "p-1" }])

    mockDb.returning.mockResolvedValueOnce([
      {
        id: "msg-new",
        content: "hello",
        type: "text",
        createdAt: new Date(),
      },
    ])

    const { POST } = await import("@/app/api/communications/dms/[id]/messages/route")
    const res = await POST(
      makeReq("/api/communications/dms/conv-1/messages", "POST", {
        json: async () => ({ content: "hello" }),
      }),
      webCtx,
      { params: { id: "conv-1" } }
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.message.content).toBe("hello")
  })
})

// ─── GET /api/communications/announcements ───────────────────────────────────

describe("GET /api/communications/announcements", () => {
  beforeEach(resetMocks)

  it("returns announcements with isRead true when already read", async () => {
    // Route has two queries:
    // Q1: select.from.leftJoin.where.orderBy.limit  → data from limit
    // Q2: select.from.where (terminates at where)   → data from second where call
    // Queue first where to return mockDb (for orderBy chain), second to return read data
    mockDb.limit.mockResolvedValueOnce([
      { id: "ann-1", title: "Town Hall", body: "details", isPinned: true },
    ])
    mockDb.where
      .mockReturnValueOnce(mockDb) // Q1 where (before orderBy)
      .mockReturnValueOnce([{ announcementId: "ann-1" }]) // Q2 reads check

    const { GET } = await import("@/app/api/communications/announcements/route")
    const res = await GET(makeReq("/api/communications/announcements"), webCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.announcements[0].isRead).toBe(true)
  })

  it("returns isRead false when not yet read", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "ann-2", title: "Update", body: "text" }])
    mockDb.where
      .mockReturnValueOnce(mockDb) // Q1 where
      .mockReturnValueOnce([]) // Q2 reads check → empty → isRead:false

    const { GET } = await import("@/app/api/communications/announcements/route")
    const res = await GET(makeReq("/api/communications/announcements"), webCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.announcements[0].isRead).toBe(false)
  })
})

// ─── POST /api/communications/announcements ───────────────────────────────────

describe("POST /api/communications/announcements", () => {
  beforeEach(resetMocks)

  it("creates announcement and returns 201", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "ann-new", title: "Hello" }])

    const { POST } = await import("@/app/api/communications/announcements/route")
    const res = await POST(
      makeReq("/api/communications/announcements", "POST", {
        json: async () => ({ title: "Hello", body: "World" }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.announcement.title).toBe("Hello")
  })

  it("returns 400 for missing required fields", async () => {
    const { POST } = await import("@/app/api/communications/announcements/route")
    const res = await POST(
      makeReq("/api/communications/announcements", "POST", {
        json: async () => ({ title: "Hello" }),
      }),
      webCtx
    )
    expect(res.status).toBe(400)
  })
})

// ─── GET /api/communications/announcements/[id] ───────────────────────────────

describe("GET /api/communications/announcements/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when not found", async () => {
    const { GET } = await import("@/app/api/communications/announcements/[id]/route")
    const res = await GET(makeReq("/api/communications/announcements/ann-1"), webCtx, {
      params: { id: "ann-1" },
    })
    expect(res.status).toBe(404)
  })

  it("returns announcement with read status", async () => {
    mockDb.limit
      .mockResolvedValueOnce([{ id: "ann-1", title: "Hello" }])
      .mockResolvedValueOnce([{ readAt: new Date("2025-01-01") }])

    const { GET } = await import("@/app/api/communications/announcements/[id]/route")
    const res = await GET(makeReq("/api/communications/announcements/ann-1"), webCtx, {
      params: { id: "ann-1" },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.announcement.isRead).toBe(true)
    expect(body.announcement.readAt).toBeTruthy()
  })
})

// ─── DELETE /api/communications/announcements/[id] ────────────────────────────

describe("DELETE /api/communications/announcements/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when not found", async () => {
    const { DELETE } = await import("@/app/api/communications/announcements/[id]/route")
    const res = await DELETE(makeReq("/api/communications/announcements/ann-1", "DELETE"), webCtx, {
      params: { id: "ann-1" },
    })
    expect(res.status).toBe(404)
  })

  it("soft-deletes and returns 204", async () => {
    // Q1: select.from.where.limit → limit returns announcement
    // Q2: update.set.where → all mockReturnThis → fine
    mockDb.limit.mockResolvedValueOnce([{ id: "ann-1" }])

    const { DELETE } = await import("@/app/api/communications/announcements/[id]/route")
    const res = await DELETE(makeReq("/api/communications/announcements/ann-1", "DELETE"), webCtx, {
      params: { id: "ann-1" },
    })
    expect(res.status).toBe(204)
  })
})

// ─── POST /api/communications/announcements/[id]/read ─────────────────────────

describe("POST /api/communications/announcements/[id]/read", () => {
  beforeEach(resetMocks)

  it("returns 404 when announcement not found", async () => {
    const { POST } = await import("@/app/api/communications/announcements/[id]/read/route")
    const res = await POST(
      makeReq("/api/communications/announcements/ann-1/read", "POST"),
      webCtx,
      { params: { id: "ann-1" } }
    )
    expect(res.status).toBe(404)
  })

  it("marks as read and returns 200 with {ok:true}", async () => {
    // Q1: select.from.where.limit → limit returns announcement
    // Q2: insert.values.onConflictDoNothing → all mockReturnThis → fine
    // Q3: update.set.where → all mockReturnThis → fine
    mockDb.limit.mockResolvedValueOnce([{ id: "ann-1", totalAudience: 50 }])

    const { POST } = await import("@/app/api/communications/announcements/[id]/read/route")
    const res = await POST(
      makeReq("/api/communications/announcements/ann-1/read", "POST"),
      webCtx,
      { params: { id: "ann-1" } }
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})
