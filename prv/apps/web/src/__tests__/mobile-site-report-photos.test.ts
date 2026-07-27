import { describe, it, expect, vi, beforeEach } from "vitest"
import type { NextRequest } from "next/server"

vi.mock("@/lib/mobile/auth", () => ({
  withMobileAuth: (handler: unknown) => handler,
}))
const auditMock = vi.fn()
vi.mock("@prv/auth", () => ({
  writeAuditLog: (...a: unknown[]) => auditMock(...a),
}))

const uploadMock = vi.fn().mockResolvedValue("https://storage/img.jpg")
vi.mock("@prv/db/storage", () => ({
  StorageBucket: { IMAGES: "images" },
  BucketAllowedMimes: { images: ["image/jpeg", "image/png", "image/webp"] },
  buildStoragePath: (...parts: string[]) => parts.join("/"),
  uploadFile: (...a: unknown[]) => uploadMock(...a),
}))

const reportRows: unknown[] = []
const updateSet = vi.fn()
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(() => reportRows),
  update: vi.fn(() => ({
    set: (v: unknown) => {
      updateSet(v)
      return { where: () => Promise.resolve() }
    },
  })),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => ({
  renovationProjects: {},
  renovationSiteReports: { photos: {}, id: {} },
}))
vi.mock("drizzle-orm", async (o) => {
  const actual = await o<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn() }
})

interface MobileCtx {
  userId: string
  companyId: string
  sessionId: string
  role: string
}
const ctx: MobileCtx = { userId: "u1", companyId: "co-1", sessionId: "s1", role: "employee" }

function makeReq(form: FormData | null): NextRequest {
  const u = new URL("http://localhost/api/mobile/projects/p1/site-reports/rep-1/photos")
  return {
    method: "POST",
    nextUrl: u,
    url: u.toString(),
    headers: { get: () => null },
    formData: async () => {
      if (!form) throw new Error("no form")
      return form
    },
  } as unknown as NextRequest
}

type Handler = (req: NextRequest, ctx: MobileCtx) => Promise<Response>
async function post(form: FormData | null): Promise<Response> {
  const mod = await import("@/app/api/mobile/projects/[id]/site-reports/[reportId]/photos/route")
  return (mod.POST as unknown as Handler)(makeReq(form), ctx)
}

function jpeg(name = "a.jpg", bytes = 100): File {
  return new File([new Uint8Array(bytes)], name, { type: "image/jpeg" })
}

beforeEach(() => {
  vi.clearAllMocks()
  reportRows.length = 0
  for (const m of ["select", "from", "innerJoin", "where"] as const) mockDb[m].mockReturnThis()
  mockDb.limit.mockImplementation(() => reportRows)
  uploadMock.mockResolvedValue("https://storage/img.jpg")
})

describe("POST .../site-reports/[reportId]/photos", () => {
  it("404s when the report is not in the caller's company", async () => {
    const form = new FormData()
    form.append("file", jpeg())
    const res = await post(form)
    expect(res.status).toBe(404)
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it("rejects unsupported image types", async () => {
    reportRows.push({ id: "rep-1", photos: [] })
    const form = new FormData()
    form.append("file", new File([new Uint8Array(10)], "x.gif", { type: "image/gif" }))
    const res = await post(form)
    expect(res.status).toBe(422)
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it("rejects photos over the 10MB cap", async () => {
    reportRows.push({ id: "rep-1", photos: [] })
    const form = new FormData()
    form.append("file", jpeg("big.jpg", 10 * 1024 * 1024 + 1))
    const res = await post(form)
    expect(res.status).toBe(422)
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it("caps a report at 30 photos", async () => {
    reportRows.push({ id: "rep-1", photos: Array.from({ length: 30 }, (_, i) => `u${i}`) })
    const form = new FormData()
    form.append("file", jpeg())
    const res = await post(form)
    expect(res.status).toBe(422)
  })

  it("uploads, appends atomically and audits", async () => {
    reportRows.push({ id: "rep-1", photos: ["existing"] })
    const form = new FormData()
    form.append("file", jpeg())
    const res = await post(form)
    expect(res.status).toBe(201)
    expect((await res.json()).url).toBe("https://storage/img.jpg")

    // storage path is company-scoped
    const [bucket, path] = uploadMock.mock.calls[0]! as [string, string]
    expect(bucket).toBe("images")
    expect(path.startsWith("co-1/site-reports/rep-1/")).toBe(true)

    expect(updateSet).toHaveBeenCalled()
    const audit = auditMock.mock.calls[0]![0] as Record<string, unknown>
    expect(audit["action"]).toBe("mobile.renovation.site_report.photo_add")
  })

  it("502s (not 201) when storage fails — the app can retry", async () => {
    reportRows.push({ id: "rep-1", photos: [] })
    uploadMock.mockRejectedValueOnce(new Error("bucket missing"))
    const form = new FormData()
    form.append("file", jpeg())
    const res = await post(form)
    expect(res.status).toBe(502)
    expect(updateSet).not.toHaveBeenCalled()
  })
})
