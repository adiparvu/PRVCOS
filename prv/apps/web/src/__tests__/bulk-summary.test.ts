import { describe, it, expect } from "vitest"
import { summarizeBulk, summarizeSettled } from "@/lib/bulk"

describe("summarizeBulk", () => {
  it("reports a plain success when every item succeeds", () => {
    const s = summarizeBulk([{ ok: true }, { ok: true }, { ok: true }])
    expect(s).toEqual({ ok: 3, failed: 0, total: 3, kind: "success" })
  })

  it("reports an error when every item fails", () => {
    const s = summarizeBulk([{ ok: false }, { ok: false }])
    expect(s).toEqual({ ok: 0, failed: 2, total: 2, kind: "error" })
  })

  it("reports a warning for a partial failure", () => {
    const s = summarizeBulk([{ ok: true }, { ok: false }, { ok: true }, { ok: false }])
    expect(s).toEqual({ ok: 2, failed: 2, total: 4, kind: "warning" })
  })

  it("treats a single success as success and a single failure as error", () => {
    expect(summarizeBulk([{ ok: true }]).kind).toBe("success")
    expect(summarizeBulk([{ ok: false }]).kind).toBe("error")
  })

  it("treats an empty list as a vacuous success with zero counts", () => {
    expect(summarizeBulk([])).toEqual({ ok: 0, failed: 0, total: 0, kind: "success" })
  })

  it("does not mutate the input array", () => {
    const input = [{ ok: true }, { ok: false }]
    const copy = input.map((o) => ({ ...o }))
    summarizeBulk(input)
    expect(input).toEqual(copy)
  })
})

describe("summarizeSettled", () => {
  const fulfilled: PromiseSettledResult<unknown> = { status: "fulfilled", value: undefined }
  const rejected: PromiseSettledResult<unknown> = { status: "rejected", reason: new Error("x") }

  it("counts fulfilled results as successes and rejected as failures", () => {
    const s = summarizeSettled([fulfilled, rejected, fulfilled])
    expect(s).toEqual({ ok: 2, failed: 1, total: 3, kind: "warning" })
  })

  it("reports success when every result is fulfilled", () => {
    expect(summarizeSettled([fulfilled, fulfilled]).kind).toBe("success")
  })

  it("reports error when every result is rejected", () => {
    expect(summarizeSettled([rejected, rejected]).kind).toBe("error")
  })

  it("treats an empty result set as a vacuous success", () => {
    expect(summarizeSettled([])).toEqual({ ok: 0, failed: 0, total: 0, kind: "success" })
  })
})
