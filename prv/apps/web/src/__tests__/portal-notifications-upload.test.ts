import { describe, it, expect, vi, beforeEach } from "vitest"

const queue: unknown[][] = []
const nextResult = () => (queue.length ? (queue.shift() ?? []) : [])
const insertedValues: unknown[] = []
const insertReturn: unknown[] = []
const updateSet = vi.fn()
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn(() => nextResult()),
  insert: vi.fn(() => ({
    values: (v: unknown) => {
      insertedValues.push(v)
      return { returning: () => insertReturn }
    },
  })),
  update: vi.fn(() => ({
    set: (v: unknown) => {
      updateSet(v)
      return { where: () => Promise.resolve() }
    },
  })),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => ({
  documents: { metadata: {}, id: {}, title: {}, createdAt: {} },
  invoices: {},
  portalAccounts: {},
  projectMessages: {},
  projects: {},
  renovationContracts: {},
  renovationProjects: {},
  renovationSiteReports: {},
}))
const uploadMock = vi.fn().mockResolvedValue("https://storage/doc.pdf")
vi.mock("@prv/db/storage", () => ({
  StorageBucket: { DOCUMENTS: "documents" },
  BucketAllowedMimes: { documents: ["application/pdf", "text/plain"] },
  buildStoragePath: (...parts: string[]) => parts.join("/"),
  uploadFile: (...a: unknown[]) => uploadMock(...a),
}))
vi.mock("drizzle-orm", async (o) => {
  const actual = await o<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn(), desc: vi.fn(), inArray: vi.fn(), isNull: vi.fn() }
})

const CTX = {
  sessionId: "ps1",
  accountId: "acct-1",
  companyId: "co-1",
  portalType: "client" as const,
  clientId: "client-1",
  supplierId: null,
  email: "c@x.ro",
  name: "Client Popescu",
}

function d(iso: string): Date {
  return new Date(iso)
}

beforeEach(() => {
  vi.clearAllMocks()
  queue.length = 0
  insertedValues.length = 0
  insertReturn.length = 0
  for (const m of ["select", "from", "innerJoin", "where", "orderBy"] as const)
    mockDb[m].mockReturnThis()
  mockDb.limit.mockImplementation(() => nextResult())
  uploadMock.mockResolvedValue("https://storage/doc.pdf")
})

describe("getClientNotifications", () => {
  it("merges sources newest-first and computes unread against the seen mark", async () => {
    queue.push([{ seenAt: d("2026-07-25T00:00:00Z") }]) // account
    queue.push([{ id: "r1", date: d("2026-07-26T10:00:00Z"), photos: ["a", "b"] }]) // reports
    queue.push([
      { id: "q1", number: "Q-14", date: d("2026-07-24T09:00:00Z"), metadata: {} },
      {
        id: "q2",
        number: "Q-15",
        date: d("2026-07-23T09:00:00Z"),
        metadata: { clientDecision: "accepted" },
      },
    ]) // quotes — decided one is filtered out
    queue.push([{ id: "i1", number: "INV-1", status: "overdue", date: d("2026-07-27T08:00:00Z") }])
    queue.push([{ id: "c1", title: "Contract Casa X", date: d("2026-07-20T08:00:00Z") }])
    queue.push([{ id: "doc1", title: "Plan.pdf", date: d("2026-07-26T12:00:00Z") }])
    queue.push([
      { id: "m1", body: "Salut!", date: d("2026-07-19T08:00:00Z"), projectName: "Casa X" },
    ])

    const { getClientNotifications } = await import("@/lib/portal-notifications")
    const feed = await getClientNotifications({
      companyId: "co-1",
      clientId: "client-1",
      accountId: "acct-1",
    })

    expect(feed.items.map((i) => i.id)).toEqual([
      "invoice-i1", // 27th
      "document-doc1", // 26th 12:00
      "report-r1", // 26th 10:00
      "quote-q1", // 24th (q2 decided → excluded)
      "contract-c1", // 20th
      "message-m1", // 19th
    ])
    // unread: items after the 25th
    expect(feed.unreadCount).toBe(3)
    expect(feed.items[0]!.unread).toBe(true)
    expect(feed.items[3]!.unread).toBe(false)
    expect(feed.items[2]!.body).toContain("2 new photos")
  })

  it("treats a never-opened feed (null seenAt) as all unread", async () => {
    queue.push([{ seenAt: null }])
    queue.push([{ id: "r1", date: d("2026-07-26T10:00:00Z"), photos: [] }])
    for (let i = 0; i < 5; i++) queue.push([])
    const { getClientNotifications } = await import("@/lib/portal-notifications")
    const feed = await getClientNotifications({
      companyId: "co-1",
      clientId: "client-1",
      accountId: "acct-1",
    })
    expect(feed.unreadCount).toBe(1)
  })
})

describe("handlePortalDocumentUpload", () => {
  function form(file?: File, type = "contract"): FormData {
    const f = new FormData()
    if (file) f.append("file", file)
    f.append("type", type)
    return f
  }

  it("403s without a linked client profile", async () => {
    const { handlePortalDocumentUpload } = await import("@/lib/portal-document-upload")
    const res = await handlePortalDocumentUpload(
      form(new File(["x"], "a.pdf", { type: "application/pdf" })),
      {
        ...CTX,
        clientId: null,
      }
    )
    expect(res.status).toBe(403)
  })

  it("rejects disallowed MIME types and oversize files", async () => {
    const { handlePortalDocumentUpload } = await import("@/lib/portal-document-upload")
    const bad = await handlePortalDocumentUpload(
      form(new File(["x"], "a.exe", { type: "application/octet-stream" })),
      CTX
    )
    expect(bad.status).toBe(422)
    const big = await handlePortalDocumentUpload(
      form(
        new File([new Uint8Array(25 * 1024 * 1024 + 1)], "big.pdf", { type: "application/pdf" })
      ),
      CTX
    )
    expect(big.status).toBe(422)
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it("uploads and inserts an under_review row with portal provenance, no user attribution", async () => {
    insertReturn.push({ id: "doc-9", title: "a.pdf" })
    const { handlePortalDocumentUpload } = await import("@/lib/portal-document-upload")
    const res = await handlePortalDocumentUpload(
      form(new File(["hello"], "a.pdf", { type: "application/pdf" })),
      CTX
    )
    expect(res.status).toBe(201)

    const [bucket, path] = uploadMock.mock.calls[0]! as [string, string]
    expect(bucket).toBe("documents")
    expect(path.startsWith("co-1/client-uploads/client-1/")).toBe(true)

    const row = insertedValues[0] as Record<string, unknown>
    expect(row["companyId"]).toBe("co-1")
    expect(row["clientId"]).toBe("client-1")
    expect(row["uploadedByUserId"]).toBeNull()
    expect(row["status"]).toBe("under_review")
    expect(row["isPublic"]).toBe(false)
    const meta = row["metadata"] as Record<string, unknown>
    expect(meta["uploadedVia"]).toBe("client_portal")
    expect(meta["portalAccountId"]).toBe("acct-1")
  })

  it("502s on storage failure without inserting a row", async () => {
    uploadMock.mockRejectedValueOnce(new Error("bucket missing"))
    const { handlePortalDocumentUpload } = await import("@/lib/portal-document-upload")
    const res = await handlePortalDocumentUpload(
      form(new File(["x"], "a.pdf", { type: "application/pdf" })),
      CTX
    )
    expect(res.status).toBe(502)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })
})
