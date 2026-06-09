import { vi, describe, it, expect, beforeEach } from "vitest"

// Stub @prv/db so the engine module can be imported without a real DB connection
vi.mock("@prv/db", () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
  },
}))
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    asc: vi.fn(),
    desc: vi.fn(),
    isNull: vi.fn(),
    sql: vi.fn(),
  }
})
vi.mock("@prv/db/schema", () => ({
  aiConversations: {},
  aiMessages: {},
  documentEmbeddings: {},
}))

import { titleFromMessage, buildAnthropicMessages } from "../index"

// ── titleFromMessage ──────────────────────────────────────────────────────────

describe("titleFromMessage", () => {
  it("returns the message as-is when shorter than maxLen", () => {
    expect(titleFromMessage("Hello world")).toBe("Hello world")
  })

  it("truncates at a word boundary and appends ellipsis", () => {
    const msg = "What is the total revenue for the current month broken down by store?"
    const result = titleFromMessage(msg, 50)
    expect(result.endsWith("…")).toBe(true)
    expect(result.length).toBeLessThanOrEqual(51) // maxLen + "…"
  })

  it("uses a custom maxLen", () => {
    const result = titleFromMessage("Short message here", 10)
    expect(result.endsWith("…")).toBe(true)
    expect(result.length).toBeLessThanOrEqual(11)
  })

  it("returns the full message when it exactly matches maxLen", () => {
    const msg = "12345"
    expect(titleFromMessage(msg, 5)).toBe("12345")
  })

  it("handles single very long word", () => {
    const msg = "Supercalifragilisticexpialidocious"
    const result = titleFromMessage(msg, 10)
    expect(result.endsWith("…")).toBe(true)
    expect(result.length).toBeLessThanOrEqual(12)
  })

  it("trims leading/trailing whitespace before measuring", () => {
    expect(titleFromMessage("  Hello  ")).toBe("Hello")
  })
})

// ── buildAnthropicMessages ────────────────────────────────────────────────────

describe("buildAnthropicMessages", () => {
  it("appends the new message as a user turn at the end", () => {
    const history = [
      { role: "user" as const, content: "Hi" },
      { role: "assistant" as const, content: "Hello!" },
    ]
    const msgs = buildAnthropicMessages(history, "What is the revenue?")
    expect(msgs[msgs.length - 1]).toEqual({ role: "user", content: "What is the revenue?" })
  })

  it("includes all history messages before the new message", () => {
    const history = [
      { role: "user" as const, content: "Q1" },
      { role: "assistant" as const, content: "A1" },
    ]
    const msgs = buildAnthropicMessages(history, "Q2")
    expect(msgs).toHaveLength(3)
    expect(msgs[0]).toEqual({ role: "user", content: "Q1" })
    expect(msgs[1]).toEqual({ role: "assistant", content: "A1" })
  })

  it("works with empty history", () => {
    const msgs = buildAnthropicMessages([], "First question")
    expect(msgs).toHaveLength(1)
    expect(msgs[0]).toEqual({ role: "user", content: "First question" })
  })

  it("slices history to last 20 entries", () => {
    const history = Array.from({ length: 25 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `msg ${i}`,
    }))
    const msgs = buildAnthropicMessages(history, "new")
    // 20 history entries + 1 new = 21
    expect(msgs).toHaveLength(21)
  })

  it("maps role and content fields correctly", () => {
    const history = [{ role: "assistant" as const, content: "Ready to help" }]
    const msgs = buildAnthropicMessages(history, "Go")
    expect(msgs[0]).toMatchObject({ role: "assistant", content: "Ready to help" })
  })
})

// ── DB-backed functions (mocked) ──────────────────────────────────────────────

describe("createConversation", () => {
  beforeEach(() => vi.clearAllMocks())

  it("inserts a new row and returns the id", async () => {
    const mockReturning = vi.fn().mockResolvedValue([{ id: "conv-123" }])
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning })
    const { db } = await import("@prv/db")
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never)

    const { createConversation } = await import("../index")
    const id = await createConversation(
      { userId: "u1", companyId: "c1", role: "ceo", scopeLevel: 1 },
      "Test conv"
    )
    expect(id).toBe("conv-123")
    expect(db.insert).toHaveBeenCalledOnce()
  })
})

describe("deleteConversation", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns true when conversation is found and soft-deleted", async () => {
    const mockReturning = vi.fn().mockResolvedValue([{ id: "conv-abc" }])
    const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning })
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere })
    const { db } = await import("@prv/db")
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as never)

    const { deleteConversation } = await import("../index")
    const result = await deleteConversation("conv-abc", "user-1")
    expect(result).toBe(true)
  })

  it("returns false when conversation not found (empty result)", async () => {
    const mockReturning = vi.fn().mockResolvedValue([])
    const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning })
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere })
    const { db } = await import("@prv/db")
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as never)

    const { deleteConversation } = await import("../index")
    const result = await deleteConversation("conv-xyz", "user-1")
    expect(result).toBe(false)
  })
})

describe("getEmbedding", () => {
  it("returns empty array (no embedding provider configured)", async () => {
    const { getEmbedding } = await import("../index")
    const result = await getEmbedding("some text", "company-1")
    expect(result).toEqual([])
  })
})

describe("semanticSearch", () => {
  it("returns empty array when no embedding provider is available", async () => {
    const { semanticSearch } = await import("../index")
    const results = await semanticSearch("revenue this month", "company-1", 5)
    expect(results).toEqual([])
  })
})
