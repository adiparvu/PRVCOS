import { describe, it, expect, vi, beforeEach } from "vitest"

// -------------------------------------------------------------------
// vi.hoisted: declare mutable state before the hoisted vi.mock factories
// -------------------------------------------------------------------
type JobHandler = (args: { event: unknown; step: Record<string, unknown> }) => Promise<unknown>
const captureRef = vi.hoisted(() => ({ handler: null as JobHandler | null }))

// -------------------------------------------------------------------
// Module mocks — hoisted above all static imports
// -------------------------------------------------------------------
vi.mock("@prv/jobs/client", () => ({
  inngest: {
    // Capture only the notification-send handler by its registered ID.
    // All 6 barrel jobs call createFunction; we filter to avoid overwriting.
    createFunction: vi.fn((cfg: unknown, _evt: unknown, fn: unknown) => {
      if ((cfg as Record<string, string>).id === "prv-notification-send") {
        captureRef.handler = fn as JobHandler
      }
      return {}
    }),
  },
}))

// Top-level mocks — implementations reset in beforeEach
const mockInsertReturning = vi.fn()
const mockInsert = vi.fn()
const mockSelectLimit = vi.fn()
const mockSelect = vi.fn()
const mockSendEmail = vi.fn()
const mockNotificationEmail = vi.fn()

vi.mock("@prv/db", () => ({ db: { insert: mockInsert, select: mockSelect } }))
vi.mock("@prv/db/schema", () => ({
  notifications: {},
  notificationPreferences: {},
  users: {},
  pushTokens: { token: {}, userId: {}, isActive: {} },
}))
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn() }))
vi.mock("@prv/email", () => ({
  sendEmail: mockSendEmail,
  EmailFrom: { NOTIFICATIONS: "PRV <notifications@prv.ro>" },
  notificationEmail: mockNotificationEmail,
}))

// Import the barrel — triggers inngest.createFunction for all 6 jobs,
// which captures the notification-send handler via the ID filter above.
import "@prv/jobs/functions"

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------
const BASE_EVENT = {
  data: {
    userId: "user-1",
    companyId: "company-1",
    type: "info" as const,
    templateId: "general",
    variables: {
      title: "Hello",
      body: "World",
      actionUrl: "https://prv.app/inbox",
      actionLabel: "Open",
    },
  },
}

function makeStep() {
  return {
    // Immediately invoke each step callback — no Inngest queue needed.
    run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
  }
}

// -------------------------------------------------------------------
// Per-test setup — use mockReset + mockImplementation so there is no
// dependency on vi.clearAllMocks clearing (or not clearing) queues.
// -------------------------------------------------------------------
beforeEach(() => {
  // Reset clears call history AND the once-queue, then re-implement.
  mockInsertReturning.mockReset().mockResolvedValue([{ id: "notif-uuid-42" }])

  mockInsert.mockReset().mockImplementation(() => ({
    values: vi.fn().mockReturnValue({ returning: mockInsertReturning }),
  }))

  mockSelectLimit.mockReset()
  // Default: email preference enabled, push disabled; user row present.
  mockSelectLimit
    .mockResolvedValueOnce([{ email: true, push: false }])
    .mockResolvedValueOnce([{ email: "alice@example.com", firstName: "Alice" }])

  mockSelect.mockReset().mockImplementation(() => ({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockImplementation(() => {
        // Must be both awaitable (for tokens query without .limit) and chainable
        const p = Promise.resolve<unknown[]>([]) as Promise<unknown[]> & {
          limit: typeof mockSelectLimit
        }
        p.limit = mockSelectLimit
        return p
      }),
    }),
  }))

  mockNotificationEmail.mockReset().mockReturnValue({ subject: "Hello", html: "<p>body</p>" })
  mockSendEmail.mockReset().mockResolvedValue({ id: "email-resend-1" })
})

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------
describe("notification-send Inngest job", () => {
  it("handler is captured (sanity check)", () => {
    expect(captureRef.handler).toBeTypeOf("function")
  })

  it("returns the inserted notification ID plus user/company context", async () => {
    const step = makeStep()
    const result = (await captureRef.handler!({ event: BASE_EVENT, step })) as Record<
      string,
      unknown
    >

    expect(result.notificationId).toBe("notif-uuid-42")
    expect(result.userId).toBe("user-1")
    expect(result.companyId).toBe("company-1")
  })

  it("marks in-app delivered, email sent, push skipped (default prefs)", async () => {
    const step = makeStep()
    const { channels } = (await captureRef.handler!({ event: BASE_EVENT, step })) as {
      channels: Record<string, boolean>
    }

    expect(channels.inApp).toBe(true)
    expect(channels.email).toBe(true)
    expect(channels.push).toBe(false)
    expect(mockSendEmail).toHaveBeenCalledOnce()
  })

  it("sends email to the correct address with the rendered subject", async () => {
    const step = makeStep()
    await captureRef.handler!({ event: BASE_EVENT, step })

    const args = mockSendEmail.mock.calls[0]![0] as Record<string, unknown>
    expect(args.to).toBe("alice@example.com")
    expect(args.subject).toBe("Hello")
  })

  it("skips email when preference row has email:false", async () => {
    mockSelectLimit
      .mockReset()
      .mockResolvedValueOnce([{ email: false, push: false }])
      .mockResolvedValueOnce([{ email: "bob@example.com", firstName: "Bob" }])

    const step = makeStep()
    const { channels } = (await captureRef.handler!({ event: BASE_EVENT, step })) as {
      channels: Record<string, boolean>
    }

    expect(channels.email).toBe(false)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it("skips email when user row is missing", async () => {
    mockSelectLimit
      .mockReset()
      .mockResolvedValueOnce([{ email: true, push: false }])
      .mockResolvedValueOnce([]) // no user found

    const step = makeStep()
    const { channels } = (await captureRef.handler!({ event: BASE_EVENT, step })) as {
      channels: Record<string, boolean>
    }

    expect(channels.email).toBe(false)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it("defaults email to enabled when no preference row exists", async () => {
    mockSelectLimit
      .mockReset()
      .mockResolvedValueOnce([]) // no prefs → email defaults to true
      .mockResolvedValueOnce([{ email: "carol@example.com", firstName: "Carol" }])

    const step = makeStep()
    const { channels } = (await captureRef.handler!({ event: BASE_EVENT, step })) as {
      channels: Record<string, boolean>
    }

    expect(channels.email).toBe(true)
    expect(mockSendEmail).toHaveBeenCalledOnce()
  })

  it("push is always false regardless of preference (no provider configured)", async () => {
    mockSelectLimit
      .mockReset()
      .mockResolvedValueOnce([{ email: false, push: true }]) // push:true in prefs
      .mockResolvedValueOnce([{ email: "dave@example.com", firstName: "Dave" }])

    const step = makeStep()
    const { channels } = (await captureRef.handler!({ event: BASE_EVENT, step })) as {
      channels: Record<string, boolean>
    }

    expect(channels.push).toBe(false)
  })

  it("runs steps in correct order: insert → resolve → send-email → send-push", async () => {
    // Set push:true so all 4 steps fire
    mockSelectLimit
      .mockReset()
      .mockResolvedValueOnce([{ email: true, push: true }])
      .mockResolvedValueOnce([{ email: "eve@example.com", firstName: "Eve" }])

    const step = makeStep()
    await captureRef.handler!({ event: BASE_EVENT, step })

    const names = (step.run.mock.calls as Array<[string, unknown]>).map(([n]) => n)
    expect(names).toEqual(["insert-notification", "resolve-preferences", "send-email", "send-push"])
  })

  it("runs only 3 steps when email is disabled", async () => {
    mockSelectLimit
      .mockReset()
      .mockResolvedValueOnce([{ email: false, push: false }])
      .mockResolvedValueOnce([{ email: "frank@example.com", firstName: "Frank" }])

    const step = makeStep()
    await captureRef.handler!({ event: BASE_EVENT, step })

    const names = (step.run.mock.calls as Array<[string, unknown]>).map(([n]) => n)
    expect(names).toEqual(["insert-notification", "resolve-preferences"])
  })
})
