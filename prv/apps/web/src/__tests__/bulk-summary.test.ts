import { describe, it, expect } from "vitest"
import { summarizeBulk } from "@/lib/bulk"

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
